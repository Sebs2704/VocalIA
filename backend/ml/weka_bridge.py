"""
Puente para usar modelos Weka vía subprocess de Java.

Soporta 3 modelos:
  - modelo_mlp_160canciones.model  → combinado (hombres + mujeres)
  - modelo_mlp_hombres.model       → solo artistas masculinos (80 canciones)
  - modelo_mlp_mujeres.model       → solo artistas femeninas  (80 canciones)

Si el modelo de género no existe, usa el combinado y filtra en Python.
"""
import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

MODELS_DIR   = Path(__file__).parent / "models"
MODEL_PATH   = MODELS_DIR / "modelo_mlp_160canciones.model"   # combinado
MODEL_PATH_M = MODELS_DIR / "modelo_mlp_hombres.model"        # solo hombres
MODEL_PATH_F = MODELS_DIR / "modelo_mlp_mujeres.model"        # solo mujeres

# ── Detección automática de Java ──────────────────────────────────────────────
_JAVA_CANDIDATES = [
    r"C:\jdk-21_windows-x64_bin\jdk-21.0.11\bin\java.exe",
    r"C:\Program Files\Java\jdk-22\bin\java.exe",
    r"C:\Program Files\Java\jdk-21\bin\java.exe",
    r"C:\Program Files\Eclipse Adoptium\jdk-21.0.11+9\bin\java.exe",
    r"C:\Program Files\Microsoft\jdk-21\bin\java.exe",
]

def _find_java() -> str:
    for candidate in _JAVA_CANDIDATES:
        if os.path.exists(candidate):
            return candidate
    found = shutil.which("java")
    return found if found else "java"

# ── Detección automática de weka.jar ─────────────────────────────────────────
_LIB_DIR = Path(__file__).parent / "lib"
_WEKA_CANDIDATES = [
    _LIB_DIR / "weka.jar",
    Path(r"C:\Program Files\Weka-3-8-7\weka.jar"),
    Path(r"C:\Program Files\Weka-3-8-6\weka.jar"),
    Path(r"C:\Program Files\Weka\weka.jar"),
]

def _find_weka() -> str | None:
    for candidate in _WEKA_CANDIDATES:
        if Path(candidate).exists():
            return str(candidate)
    return None

JAVA_EXE = _find_java()
WEKA_JAR = _find_weka() or str(_WEKA_CANDIDATES[0])

logger.info("Weka bridge — Java: %s | JAR: %s", JAVA_EXE, WEKA_JAR)

# ── Clases: modelo combinado (160 canciones, orden alfabético) ────────────────
CLASS_NAMES = [
    "A gritos de esperanza - Alex Ubago",
    "A veces a besos - Greeicy",
    "Aca entre nos - Vicente Fernandez",
    "Addicted to you - Shakira",
    "Alguien como tu - Josean Log",
    "Amor viejo - Kevin Kaarl",
    "Aunque no te pueda ver - Alex Ubago",
    "Azul celeste - Paquita la del barrio",
    "Back to black - Amy Winehouse",
    "Bad - Michael Jackson",
    "Bajo el agua - Manuel Medrano",
    "Beat it - Michael Jackson",
    "Beso - Josean Log",
    "Billie Jean - Michael Jackson",
    "Bitch better have my money - Rihanna",
    "Bored - Laufey",
    "Borracho te recuerdo - Vicente Fernandez",
    "Brooklyn baby - Lana del rey",
    "Caminando por la vida - Melendi",
    "Chachacha - Josean log",
    "Cheque al portamor - Melendi",
    "Chicago - Michael Jackson",
    "Cinnamon girl - Lana del rey",
    "Cola - Lana del rey",
    "Colapso - Kevin Kaarl",
    "Combustion - Josean Log",
    "Como hacer para olvidarte - Manuel Medrano",
    "Dame tu aire - Alex Ubago",
    "Dead women - Mitski",
    "Desde que estamos juntos - Melendi",
    "Diamonds - Rihanna",
    "Doma - Josean log",
    "Donde nadie pueda ir - Manuel Medrano",
    "Dont stop the music - Rihanna",
    "Easy on me - Adele",
    "El chofer - Vicente Fernandez",
    "Es que yo te quiero a ti - Kevin Kaarl",
    "Estos celos - Vicente Fernandez",
    "Euphoria - Jung Kook",
    "Fecha de caducidad - Melendi",
    "First love late spring - Mitski",
    "Fragile - Laufey",
    "From the start - Laufey",
    "Gitana - Shakira",
    "Hate you - Jung Kook",
    "Hello - Adele",
    "Hombres malvados - Paquita la del barrio",
    "I am - Milo J",
    "I bet on losing dogs - Mitski",
    "I'll change for you - Mitski",
    "In a lake portuguese -  Mitski",
    "In my bed - Amy Winehouse",
    "In my blood - Shawn Mendes",
    "Just friends - Amy Winehouse",
    "La distancia - Manuel Medrano",
    "La ley del monte - Vicente Fernandez",
    "La luna - Josean Log",
    "La mujer que bota fuego - Manuel Medrano",
    "La negra tiene tumbao - Celia Cruz",
    "La promesa - Melendi",
    "La vida es un carnaval - Celia Cruz",
    "Las de la intruicion - Shakira",
    "Let you break my heart again - Laufey",
    "Limonar - Greeicy",
    "Lo hecho esta hecho - Shakira",
    "Loba - Shakira",
    "Los besos - Greeicy",
    "Los consejos - Greeicy",
    "Love in the dark - Adele",
    "Love is a losing game - Amy Winehouse",
    "Love on the brain - Rihanna",
    "Lover girl - Laufey",
    "MAI - Milo J",
    "Man down - Rihanna",
    "Mas fuerte - Greeicy",
    "Me arrepiento - Alex Ubago",
    "Me enamore - Shakira",
    "Mentira - Greeicy",
    "Mercy - Shawn Mendes",
    "Milagrosa - Milo J",
    "Mujeres divinas - Vicente Fernandez",
    "My love mine all mine - Mitski",
    "My you - Jung Kook",
    "Never be alone - Shawn Mendes",
    "NiÃ±o - Milo J",
    "No me culpes por sentir - Kevin Kaarl",
    "Nobody - Mitski",
    "Only girl - Rihanna",
    "Para siempre - Vicente Fernandez",
    "Pierdeme el respeto - Paquita la del barrio",
    "Pobre pistolita - Paquita la del barrio",
    "Por si acaso no regreso - Celia Cruz",
    "Promise - Laufey",
    "Que le den candela - Celia Cruz",
    "Que me perdone tu perro - Paquita la del barrio",
    "Que pides tu - Alex Ubago",
    "Quedate - Manuel Medrano",
    "Quiero + - Greeicy",
    "Quimbara - Celia Cruz",
    "Rara vez - Milo J",
    "Rata de dos patas - Paquita la del barrio",
    "Rehab - Amy Winehouse",
    "Remember the time  Michael Jackson",
    "Retirada - Milo J",
    "Rie y llora - Celia Cruz",
    "Rincon - Milo J",
    "Rolling in the deep - Adele",
    "Sabes - Alex Ubago",
    "San lucas - Kevin Kaarl",
    "Sangre para derramar - Milo J",
    "Say yes to heaven - Lana del rey",
    "Send my love - Adele",
    "Set fire to the rain - Adele",
    "Si hay algo - Josean Log",
    "Si pudiera - Manuel Medrano",
    "Si supieras - Kevin Kaarl",
    "Sigo aqui - Alex Ubago",
    "Sin miedo a nada - Alex Ubago",
    "Sin remitente - Melendi",
    "Smooth criminal - Michael Jackson",
    "Soltera - Shakira",
    "Somedoy - Jung Kook",
    "Someone like you - Adele",
    "Standing next to you - Jung Kook",
    "Still with you - Jung Kook",
    "Stitches - Shawn Mendes",
    "Stronger than me - Amy Winehouse",
    "Summertime sadness - Lana del rey",
    "Taco placero - Paquita la del barrio",
    "Te busco audio - Celia Cruz",
    "Te quiero tanto - Kevin Kaarl",
    "Tears dry on their own - Amy Winehouse",
    "The girl is mine - Michael Jackson",
    "There's nothing holding me back - Shawn Mendes",
    "Thriller - Michael Jackson",
    "Tierra - Josean Log",
    "Too little too late - Laufey",
    "Too sad to dance - Jung Kook",
    "Top of the world - Shawn Mendes",
    "Treat you better - Shawn Mendes",
    "Tres veces te engaÃ±e - Paquita la del barrio",
    "Tu jardin con enanitos - Melendi",
    "Ultraviolence - Lana del rey",
    "Un violinista en tu tejado - Melendi",
    "Una y otra vez - Manuel Medrano",
    "Valentine - Laufey",
    "Vamonos a marte - Kevin Kaarl",
    "Volver, volver - Vicente Fernandez",
    "Waka waka - Shakira",
    "Washin machine - Mitski",
    "West coast - Lana del rey",
    "When we were young - Adele",
    "Where have you been - Rihanna",
    "Why why why - Shawn Mendes",
    "Ya para que - Greeicy",
    "Yes or no - Jung Kook",
    "Yo vivire (I will survive) - Celia Cruz",
    "You da one - Rihanna",
    "You know i'm no good - Amy Winehouse",
    "Young and beautiful - Lana del rey ",
]

# ── Clases: solo artistas masculinos (80 canciones, orden alfabético) ─────────
# IMPORTANTE: este orden debe coincidir EXACTAMENTE con el ARFF de entrenamiento
# del modelo modelo_mlp_hombres.model. Entrena Weka con este mismo orden de clases.
CLASS_NAMES_M = [
    "A gritos de esperanza - Alex Ubago",
    "Aca entre nos - Vicente Fernandez",
    "Alguien como tu - Josean Log",
    "Amor viejo - Kevin Kaarl",
    "Aunque no te pueda ver - Alex Ubago",
    "Bad - Michael Jackson",
    "Bajo el agua - Manuel Medrano",
    "Beat it - Michael Jackson",
    "Beso - Josean Log",
    "Billie Jean - Michael Jackson",
    "Borracho te recuerdo - Vicente Fernandez",
    "Caminando por la vida - Melendi",
    "Chachacha - Josean log",
    "Cheque al portamor - Melendi",
    "Chicago - Michael Jackson",
    "Colapso - Kevin Kaarl",
    "Combustion - Josean Log",
    "Como hacer para olvidarte - Manuel Medrano",
    "Dame tu aire - Alex Ubago",
    "Desde que estamos juntos - Melendi",
    "Doma - Josean log",
    "Donde nadie pueda ir - Manuel Medrano",
    "El chofer - Vicente Fernandez",
    "Es que yo te quiero a ti - Kevin Kaarl",
    "Estos celos - Vicente Fernandez",
    "Euphoria - Jung Kook",
    "Fecha de caducidad - Melendi",
    "Hate you - Jung Kook",
    "I am - Milo J",
    "In my blood - Shawn Mendes",
    "La distancia - Manuel Medrano",
    "La ley del monte - Vicente Fernandez",
    "La luna - Josean Log",
    "La mujer que bota fuego - Manuel Medrano",
    "La promesa - Melendi",
    "MAI - Milo J",
    "Me arrepiento - Alex Ubago",
    "Mercy - Shawn Mendes",
    "Milagrosa - Milo J",
    "Mujeres divinas - Vicente Fernandez",
    "My you - Jung Kook",
    "Never be alone - Shawn Mendes",
    "NiÃ±o - Milo J",
    "No me culpes por sentir - Kevin Kaarl",
    "Para siempre - Vicente Fernandez",
    "Que pides tu - Alex Ubago",
    "Quedate - Manuel Medrano",
    "Rara vez - Milo J",
    "Remember the time  Michael Jackson",
    "Retirada - Milo J",
    "Rincon - Milo J",
    "Sabes - Alex Ubago",
    "San lucas - Kevin Kaarl",
    "Sangre para derramar - Milo J",
    "Si hay algo - Josean Log",
    "Si pudiera - Manuel Medrano",
    "Si supieras - Kevin Kaarl",
    "Sigo aqui - Alex Ubago",
    "Sin miedo a nada - Alex Ubago",
    "Sin remitente - Melendi",
    "Smooth criminal - Michael Jackson",
    "Somedoy - Jung Kook",
    "Standing next to you - Jung Kook",
    "Still with you - Jung Kook",
    "Stitches - Shawn Mendes",
    "Te quiero tanto - Kevin Kaarl",
    "The girl is mine - Michael Jackson",
    "There's nothing holding me back - Shawn Mendes",
    "Thriller - Michael Jackson",
    "Tierra - Josean Log",
    "Too sad to dance - Jung Kook",
    "Top of the world - Shawn Mendes",
    "Treat you better - Shawn Mendes",
    "Tu jardin con enanitos - Melendi",
    "Un violinista en tu tejado - Melendi",
    "Una y otra vez - Manuel Medrano",
    "Vamonos a marte - Kevin Kaarl",
    "Volver, volver - Vicente Fernandez",
    "Why why why - Shawn Mendes",
    "Yes or no - Jung Kook",
]

# ── Clases: solo artistas femeninas (80 canciones, orden alfabético) ──────────
# IMPORTANTE: ídem — debe coincidir con el ARFF de modelo_mlp_mujeres.model.
CLASS_NAMES_F = [
    "A veces a besos - Greeicy",
    "Addicted to you - Shakira",
    "Azul celeste - Paquita la del barrio",
    "Back to black - Amy Winehouse",
    "Bitch better have my money - Rihanna",
    "Bored - Laufey",
    "Brooklyn baby - Lana del rey",
    "Cinnamon girl - Lana del rey",
    "Cola - Lana del rey",
    "Dead women - Mitski",
    "Diamonds - Rihanna",
    "Dont stop the music - Rihanna",
    "Easy on me - Adele",
    "First love late spring - Mitski",
    "Fragile - Laufey",
    "From the start - Laufey",
    "Gitana - Shakira",
    "Hello - Adele",
    "Hombres malvados - Paquita la del barrio",
    "I bet on losing dogs - Mitski",
    "I'll change for you - Mitski",
    "In a lake portuguese -  Mitski",
    "In my bed - Amy Winehouse",
    "Just friends - Amy Winehouse",
    "La negra tiene tumbao - Celia Cruz",
    "La vida es un carnaval - Celia Cruz",
    "Las de la intruicion - Shakira",
    "Let you break my heart again - Laufey",
    "Limonar - Greeicy",
    "Lo hecho esta hecho - Shakira",
    "Loba - Shakira",
    "Los besos - Greeicy",
    "Los consejos - Greeicy",
    "Love in the dark - Adele",
    "Love is a losing game - Amy Winehouse",
    "Love on the brain - Rihanna",
    "Lover girl - Laufey",
    "Man down - Rihanna",
    "Mas fuerte - Greeicy",
    "Me enamore - Shakira",
    "Mentira - Greeicy",
    "My love mine all mine - Mitski",
    "Nobody - Mitski",
    "Only girl - Rihanna",
    "Pierdeme el respeto - Paquita la del barrio",
    "Pobre pistolita - Paquita la del barrio",
    "Por si acaso no regreso - Celia Cruz",
    "Promise - Laufey",
    "Que le den candela - Celia Cruz",
    "Que me perdone tu perro - Paquita la del barrio",
    "Quiero + - Greeicy",
    "Quimbara - Celia Cruz",
    "Rata de dos patas - Paquita la del barrio",
    "Rehab - Amy Winehouse",
    "Rie y llora - Celia Cruz",
    "Rolling in the deep - Adele",
    "Say yes to heaven - Lana del rey",
    "Send my love - Adele",
    "Set fire to the rain - Adele",
    "Soltera - Shakira",
    "Someone like you - Adele",
    "Stronger than me - Amy Winehouse",
    "Summertime sadness - Lana del rey",
    "Taco placero - Paquita la del barrio",
    "Te busco audio - Celia Cruz",
    "Tears dry on their own - Amy Winehouse",
    "Too little too late - Laufey",
    "Tres veces te engaÃ±e - Paquita la del barrio",
    "Ultraviolence - Lana del rey",
    "Valentine - Laufey",
    "Waka waka - Shakira",
    "Washin machine - Mitski",
    "West coast - Lana del rey",
    "When we were young - Adele",
    "Where have you been - Rihanna",
    "Ya para que - Greeicy",
    "Yo vivire (I will survive) - Celia Cruz",
    "You da one - Rihanna",
    "You know i'm no good - Amy Winehouse",
    "Young and beautiful - Lana del rey ",
]


def normalize_weka_name(name: str) -> str:
    """Invierte el Mojibake cp1252→utf-8 y elimina espacios sobrantes."""
    name = name.strip()
    try:
        return name.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name


def _quote(name: str) -> str:
    if "'" in name:
        return f'"{name}"'
    return f"'{name}'"


def _build_test_arff(u_min: float, u_max: float, u_base: float,
                     class_names: list[str]) -> str:
    rango = u_max - u_min
    features = [u_min, u_max, u_base, u_base, u_min, u_max, rango, rango]
    classes_str = ",".join(_quote(c) for c in class_names)
    data_row = ",".join(str(round(f, 4)) for f in features) + ",?"
    return (
        "@relation compatibilidad_vocal_opcionA\n\n"
        "@attribute F_min numeric\n"
        "@attribute F_max numeric\n"
        "@attribute F_prom numeric\n"
        "@attribute F_mediana numeric\n"
        "@attribute P10 numeric\n"
        "@attribute P90 numeric\n"
        "@attribute Rango numeric\n"
        "@attribute Rango_efectivo numeric\n"
        f"@attribute label {{{classes_str}}}\n\n"
        "@data\n"
        f"{data_row}\n"
    )


def _parse_distribution(stdout: str, class_names: list[str]) -> list[tuple[str, float]]:
    dist_line = None
    for line in stdout.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("=") or stripped.startswith("inst"):
            continue
        parts = stripped.split()
        if parts and parts[0].isdigit():
            dist_line = stripped
            break

    if dist_line is None:
        logger.warning("No se encontró línea de distribución:\n%s", stdout[:500])
        return []

    start = dist_line.rfind("(")
    end   = dist_line.rfind(")")
    if start != -1 and end != -1:
        dist_str = dist_line[start + 1 : end]
    else:
        m = re.search(r'(\*?[\d.]+(?:,\*?[\d.]+)+)\s*$', dist_line)
        if not m:
            logger.warning("No se encontró distribución en: %s", dist_line[:300])
            return []
        dist_str = m.group(1)

    probs = []
    for token in dist_str.split(","):
        token = token.strip().lstrip("*")
        try:
            probs.append(float(token))
        except ValueError:
            probs.append(0.0)

    if len(probs) != len(class_names):
        logger.warning("Distribución: %d probs vs %d clases", len(probs), len(class_names))
        return []

    return [(normalize_weka_name(n), p) for n, p in zip(class_names, probs)]


def predict_top_songs(
    u_min: float,
    u_max: float,
    u_base: float,
    n: int = 3,
    sex_filter: str | None = None,  # "M", "F" o None para combinado
) -> list[tuple[str, float]]:
    """
    Predice las N canciones más compatibles.
    - sex_filter="M" → usa modelo_mlp_hombres.model si existe, si no filtra el combinado
    - sex_filter="F" → usa modelo_mlp_mujeres.model si existe, si no filtra el combinado
    - sex_filter=None → usa modelo_mlp_160canciones.model
    """
    weka_jar = _find_weka()
    if weka_jar is None:
        logger.warning("Weka JAR no encontrado")
        return []

    # Seleccionar modelo y lista de clases
    if sex_filter == "M" and MODEL_PATH_M.exists():
        model_path  = MODEL_PATH_M
        class_names = CLASS_NAMES_M
        logger.info("Usando modelo masculino (%d canciones)", len(CLASS_NAMES_M))
    elif sex_filter == "F" and MODEL_PATH_F.exists():
        model_path  = MODEL_PATH_F
        class_names = CLASS_NAMES_F
        logger.info("Usando modelo femenino (%d canciones)", len(CLASS_NAMES_F))
    else:
        # Modelo combinado; si se pidió filtro de género se filtra en Python después
        model_path  = MODEL_PATH
        class_names = CLASS_NAMES
        if sex_filter:
            logger.info("Modelo género '%s' no disponible aún — usando combinado + filtro Python", sex_filter)

    if not model_path.exists():
        logger.warning("Modelo Weka no encontrado: %s", model_path)
        return []

    java_exe     = _find_java()
    arff_content = _build_test_arff(u_min, u_max, u_base, class_names)

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".arff", delete=False, encoding="utf-8"
        ) as tmp:
            tmp.write(arff_content)
            tmp_path = tmp.name

        result = subprocess.run(
            [
                java_exe, "-cp", weka_jar,
                "weka.classifiers.functions.MultilayerPerceptron",
                "-l", str(model_path),
                "-T", tmp_path,
                "-p", "0",
                "-distribution",
            ],
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
            timeout=30,
        )

        if result.returncode != 0:
            logger.error("Weka returncode=%d\nSTDERR:\n%s", result.returncode, result.stderr[:1000])
            return []

        pairs = _parse_distribution(result.stdout, class_names)

        # Si usamos el modelo combinado con filtro de género, filtrar aquí
        if sex_filter and model_path == MODEL_PATH:
            target_set = set(CLASS_NAMES_M) if sex_filter == "M" else set(CLASS_NAMES_F)
            pairs = [(name, prob) for name, prob in pairs if name in target_set]

        pairs.sort(key=lambda x: x[1], reverse=True)
        return pairs[:n]

    except subprocess.TimeoutExpired:
        logger.error("Weka subprocess timeout")
        return []
    except Exception as exc:
        logger.error("Error en predict_top_songs Weka: %s", exc, exc_info=True)
        return []
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def is_available() -> bool:
    jar    = _find_weka()
    java   = _find_java()
    exists = MODEL_PATH.exists()
    return exists and jar is not None and (java == "java" or os.path.exists(java))


def diagnose() -> dict:
    java_exe     = _find_java()
    weka_jar     = _find_weka()
    java_exists  = java_exe == "java" or os.path.exists(java_exe)
    jar_exists   = weka_jar is not None

    info: dict = {
        "java_exe":        java_exe,
        "java_exists":     java_exists,
        "weka_jar":        weka_jar or "NO ENCONTRADO",
        "jar_exists":      jar_exists,
        "model_combined":  {"path": str(MODEL_PATH),   "exists": MODEL_PATH.exists()},
        "model_hombres":   {"path": str(MODEL_PATH_M), "exists": MODEL_PATH_M.exists()},
        "model_mujeres":   {"path": str(MODEL_PATH_F), "exists": MODEL_PATH_F.exists()},
        "ready":           java_exists and jar_exists and MODEL_PATH.exists(),
    }
    return info
