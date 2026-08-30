# Directory tree vectors

Tree tests verify the specified domain separator, u64 big-endian framing, UTF-8 text normalization, NFC path requirement, and unsigned UTF-8 byte ordering. The LF/CRLF equivalence vector is computed by the Groundtrail wrapper and independently cross-checked with a Python 3.12 byte-framing script before this fixture was added.
