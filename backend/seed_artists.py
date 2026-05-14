"""
Datos de artistas con estadísticas vocales y género musical.
Se insertan en MongoDB al arrancar la aplicación (upsert idempotente).
"""

ARTISTS_DATA = [
    # ── Mujeres ──────────────────────────────────────────────────────────────
    {
        "_id": "Adele", "sex": "F", "genero_musical": "Pop / Soul",
        "F_min": 71.295,   "F_max": 1011.9622, "F_prom": 356.4564,
        "F_mediana": 337.7465, "P10": 229.3899, "P90": 472.3811,
        "Rango": 940.6672, "Rango_efectivo": 242.9912,
    },
    {
        "_id": "Amy Winehouse", "sex": "F", "genero_musical": "Soul / Jazz",
        "F_min": 102.1137, "F_max": 865.2294,  "F_prom": 299.987,
        "F_mediana": 293.5849, "P10": 225.1557, "P90": 363.5684,
        "Rango": 763.1157, "Rango_efectivo": 138.4127,
    },
    {
        "_id": "Celia Cruz", "sex": "F", "genero_musical": "Salsa / Tropical",
        "F_min": 92.5485,  "F_max": 1066.9216, "F_prom": 316.6185,
        "F_mediana": 293.7042, "P10": 219.3688, "P90": 424.7347,
        "Rango": 974.3731, "Rango_efectivo": 205.3659,
    },
    {
        "_id": "Greeicy", "sex": "F", "genero_musical": "Pop / Urbano",
        "F_min": 95.1116,  "F_max": 888.8927,  "F_prom": 304.8841,
        "F_mediana": 302.48,   "P10": 232.1938, "P90": 385.6476,
        "Rango": 793.7811, "Rango_efectivo": 153.4538,
    },
    {
        "_id": "Lana del rey", "sex": "F", "genero_musical": "Indie Pop",
        "F_min": 83.1009,  "F_max": 921.759,   "F_prom": 319.8059,
        "F_mediana": 303.6463, "P10": 190.8037, "P90": 451.138,
        "Rango": 838.658,  "Rango_efectivo": 260.3344,
    },
    {
        "_id": "Laufey", "sex": "F", "genero_musical": "Jazz / Indie",
        "F_min": 104.9766, "F_max": 892.3689,  "F_prom": 305.4744,
        "F_mediana": 296.0956, "P10": 221.9933, "P90": 392.9821,
        "Rango": 787.3923, "Rango_efectivo": 170.9888,
    },
    {
        "_id": "Mitski", "sex": "F", "genero_musical": "Indie Rock",
        "F_min": 102.0247, "F_max": 912.133,   "F_prom": 271.1403,
        "F_mediana": 266.5045, "P10": 174.841,  "P90": 352.7483,
        "Rango": 810.1082, "Rango_efectivo": 177.9073,
    },
    {
        "_id": "Paquita la del barrio", "sex": "F", "genero_musical": "Ranchera",
        "F_min": 65.4064,  "F_max": 813.9586,  "F_prom": 276.0744,
        "F_mediana": 276.6655, "P10": 136.8969, "P90": 402.0649,
        "Rango": 748.5522, "Rango_efectivo": 265.168,
    },
    {
        "_id": "Rihanna", "sex": "F", "genero_musical": "Pop / R&B",
        "F_min": 76.2365,  "F_max": 1002.1187, "F_prom": 356.6678,
        "F_mediana": 350.6277, "P10": 252.5558, "P90": 450.3868,
        "Rango": 925.8822, "Rango_efectivo": 197.831,
    },
    {
        "_id": "Shakira", "sex": "F", "genero_musical": "Pop Latino",
        "F_min": 97.9748,  "F_max": 971.4058,  "F_prom": 353.4832,
        "F_mediana": 337.7843, "P10": 245.1532, "P90": 498.5031,
        "Rango": 873.431,  "Rango_efectivo": 253.3499,
    },
    # ── Hombres ──────────────────────────────────────────────────────────────
    {
        "_id": "Alex Ubago", "sex": "M", "genero_musical": "Pop / Balada",
        "F_min": 65.89,    "F_max": 619.2648,  "F_prom": 211.3751,
        "F_mediana": 197.7785, "P10": 132.6734, "P90": 305.8229,
        "Rango": 553.3748, "Rango_efectivo": 173.1496,
    },
    {
        "_id": "Josean Log", "sex": "M", "genero_musical": "Pop Latino",
        "F_min": 65.4064,  "F_max": 624.9289,  "F_prom": 215.3901,
        "F_mediana": 219.2358, "P10": 106.2105, "P90": 289.3986,
        "Rango": 559.5225, "Rango_efectivo": 183.1881,
    },
    {
        "_id": "Jung Kook", "sex": "M", "genero_musical": "K-Pop",
        "F_min": 77.818,   "F_max": 892.1811,  "F_prom": 309.7509,
        "F_mediana": 293.6846, "P10": 215.5165, "P90": 404.1687,
        "Rango": 814.3631, "Rango_efectivo": 188.6521,
    },
    {
        "_id": "Kevin Kaarl", "sex": "M", "genero_musical": "Pop / Country",
        "F_min": 65.4538,  "F_max": 587.5749,  "F_prom": 189.4622,
        "F_mediana": 176.4337, "P10": 115.4204, "P90": 279.6743,
        "Rango": 522.1212, "Rango_efectivo": 164.2539,
    },
    {
        "_id": "Manuel Medrano", "sex": "M", "genero_musical": "Pop / Rock",
        "F_min": 65.7438,  "F_max": 661.8225,  "F_prom": 191.5785,
        "F_mediana": 185.1133, "P10": 120.731,  "P90": 255.1735,
        "Rango": 596.0788, "Rango_efectivo": 134.4426,
    },
    {
        "_id": "Melendi", "sex": "M", "genero_musical": "Pop / Rock Español",
        "F_min": 65.4064,  "F_max": 714.4976,  "F_prom": 209.5239,
        "F_mediana": 198.1482, "P10": 129.5638, "P90": 292.157,
        "Rango": 649.0912, "Rango_efectivo": 162.5932,
    },
    {
        "_id": "Michael Jackson", "sex": "M", "genero_musical": "Pop / R&B",
        "F_min": 65.4064,  "F_max": 998.0711,  "F_prom": 321.6484,
        "F_mediana": 299.7564, "P10": 150.99,   "P90": 509.3572,
        "Rango": 932.6647, "Rango_efectivo": 358.3672,
    },
    {
        "_id": "Milo J", "sex": "M", "genero_musical": "Pop / Urbano",
        "F_min": 68.5492,  "F_max": 741.5993,  "F_prom": 192.8774,
        "F_mediana": 176.738,  "P10": 124.8548, "P90": 267.6889,
        "Rango": 673.05,   "Rango_efectivo": 142.8341,
    },
    {
        "_id": "Shawn Mendes", "sex": "M", "genero_musical": "Pop / Folk",
        "F_min": 65.4064,  "F_max": 836.9296,  "F_prom": 259.2279,
        "F_mediana": 253.1802, "P10": 143.9874, "P90": 369.7879,
        "Rango": 771.5232, "Rango_efectivo": 225.8004,
    },
    {
        "_id": "Vicente Fernandez", "sex": "M", "genero_musical": "Ranchera / Mariachi",
        "F_min": 66.4076,  "F_max": 699.4421,  "F_prom": 249.6406,
        "F_mediana": 250.7359, "P10": 143.5018, "P90": 338.1643,
        "Rango": 633.0345, "Rango_efectivo": 194.6625,
    },
]


async def seed_artists():
    """Upsert artist vocal-stats into MongoDB. Safe to call on every startup."""
    from database import artists_col
    for artist in ARTISTS_DATA:
        await artists_col.update_one(
            {"_id": artist["_id"]},
            {"$set": artist},
            upsert=True,
        )
