"""Shared helpers for normalizing persisted and live equalizer settings."""

EQ_BAND_FREQUENCIES = (31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000)
EQ_BAND_COUNT = len(EQ_BAND_FREQUENCIES)


def normalize_custom_eq(value: object) -> list[int]:
    """Return a clamped 10-band curve, expanding legacy 5-band settings."""
    if not isinstance(value, (list, tuple)):
        return [0] * EQ_BAND_COUNT

    try:
        bands = [max(-12, min(12, int(round(float(gain))))) for gain in value]
    except (TypeError, ValueError, OverflowError):
        return [0] * EQ_BAND_COUNT

    if len(bands) == EQ_BAND_COUNT:
        return bands
    if len(bands) == 5:
        return [
            bands[0], bands[0], bands[1], bands[1], bands[2],
            bands[2], bands[3], bands[3], bands[4], bands[4],
        ]
    return [0] * EQ_BAND_COUNT
