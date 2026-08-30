# JCS vectors

These fixed inputs cover JCS key order, safe numeric domain, and lowercase SHA-256 wrappers. Expected JCS values were independently checked with `canonicalize` 4.0.0 (JavaScript) and Python 3.12 `json.dumps` for the integer-only vector, using compact sorted output. Decimal/exponent conformance is delegated to the selected RFC 8785 implementation and exercised by its package tests.

The runtime tests are immutable-wrapper tests; the fixed source files remain language-neutral.
