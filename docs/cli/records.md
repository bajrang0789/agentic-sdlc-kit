# Verify Trail Records

Trail Records are append-only NDJSON entries for a Change Thread. Verify a local record stream with:

```sh
groundtrail records verify examples/small-web-change/records.ndjson
```

For a checkpoint supplied by another trusted system, require its exact sequence and digest:

```sh
groundtrail records verify records.ndjson \
  --checkpoint <sequence>:<64-lowercase-hex-digest>
```

## Checks performed

Verification checks UTF-8 and record schemas; a single Change Thread identity; unique IDs; contiguous sequence beginning at `0`; the fixed origin `priorDigest` at sequence `0`; links to the immediately prior digest; each record’s self digest; revision binding; allowed Track State edges; and supersession references. A checkpoint comparison requires the supplied sequence to have exactly the supplied lowercase SHA-256 digest.

Trail Record digests use RFC 8785 JSON Canonicalization Scheme (JCS). Directory-tree digests use a separately specified path-and-content framing and normalize declared text files to LF. Groundtrail uses lowercase, 64-character hexadecimal SHA-256 values in v1 digest fields.

## Evidence and checkpoint limits

The chain is tamper-evident, not independently immutable. Someone able to replace every record can recompute every digest. A matching checkpoint only proves byte equality with the supplied value; it does not establish the checkpoint issuer, signature, publication, or trust.

Durable assurance requires a checkpoint established by an authority your external governance system trusts, for example a signed release, CI attestation, transparency-log entry, or governance-system record. Groundtrail validates supplied checkpoints but does not publish checkpoints or operate a checkpoint service.

A Claim Record may explain a conclusion but never satisfies a Control Point. Only a current Source Record from an authority allowed by the relevant policy can satisfy one. Revision changes make revision-bound evidence stale until reevaluated.
