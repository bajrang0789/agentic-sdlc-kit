// SPDX-License-Identifier: Apache-2.0

import { GroundtrailError } from './errors.js';

export interface SourceRecord {
  readonly id: string;
  readonly issuer: { readonly id: string; readonly type: string };
  readonly sourceType: string;
  readonly subject: { readonly id: string; readonly revision: string };
  readonly result: string;
  readonly observedAt: string;
  readonly expiresAt?: string;
}

export interface ControlPoint {
  readonly id: string;
  readonly status: string;
  readonly requiredSourceTypes: readonly string[];
  readonly requiredIssuers: readonly string[];
  readonly revision: string;
  readonly freshnessRequired?: boolean;
  readonly satisfiedBy?: readonly string[];
  readonly waiver?: {
    readonly sourceRecordId: string;
    readonly expiresAt: string;
    readonly revision: string;
  };
}

export function validateControlPointSources(
  controlPoint: ControlPoint,
  sources: readonly SourceRecord[],
  now = new Date(),
): void {
  if (controlPoint.status === 'waived') {
    validateWaiver(controlPoint, sources, now);
    return;
  }
  if (controlPoint.status !== 'satisfied') return;
  if (controlPoint.satisfiedBy === undefined || controlPoint.satisfiedBy.length === 0)
    throw invalidEvidence(
      'GT_CONTROL_POINT_SOURCES',
      'Satisfied Control Point requires Source Record IDs.',
    );
  const byId = new Map(sources.map((source) => [source.id, source]));
  const sourceTypes = new Set<string>();
  const issuers = new Set<string>();
  for (const id of controlPoint.satisfiedBy) {
    const source = byId.get(id);
    if (source === undefined)
      throw invalidEvidence(
        'GT_CONTROL_POINT_SOURCE_MISSING',
        `Control Point references missing Source Record ${id}.`,
      );
    if (source.subject.revision !== controlPoint.revision)
      throw invalidEvidence(
        'GT_CONTROL_POINT_SOURCE_REVISION',
        `Source Record ${id} is bound to a different revision.`,
      );
    if (
      controlPoint.requiredSourceTypes.length > 0 &&
      !controlPoint.requiredSourceTypes.includes(source.sourceType)
    )
      throw invalidEvidence(
        'GT_CONTROL_POINT_SOURCE_TYPE',
        `Source Record ${id} has an unaccepted source type.`,
      );
    if (
      controlPoint.requiredIssuers.length > 0 &&
      !controlPoint.requiredIssuers.includes(source.issuer.id)
    )
      throw invalidEvidence(
        'GT_CONTROL_POINT_SOURCE_ISSUER',
        `Source Record ${id} has an unaccepted issuer.`,
      );
    if (!['pass', 'approved', 'observed'].includes(source.result))
      throw invalidEvidence(
        'GT_CONTROL_POINT_SOURCE_RESULT',
        `Source Record ${id} has a non-satisfying result.`,
      );
    if (
      controlPoint.freshnessRequired &&
      source.expiresAt !== undefined &&
      Date.parse(source.expiresAt) <= now.valueOf()
    )
      throw invalidEvidence('GT_CONTROL_POINT_SOURCE_EXPIRED', `Source Record ${id} is expired.`);
    sourceTypes.add(source.sourceType);
    issuers.add(source.issuer.id);
  }
  for (const sourceType of controlPoint.requiredSourceTypes)
    if (!sourceTypes.has(sourceType))
      throw invalidEvidence(
        'GT_CONTROL_POINT_SOURCE_TYPE',
        `Control Point lacks a satisfying Source Record of type ${sourceType}.`,
      );
  for (const issuer of controlPoint.requiredIssuers)
    if (!issuers.has(issuer))
      throw invalidEvidence(
        'GT_CONTROL_POINT_SOURCE_ISSUER',
        `Control Point lacks a satisfying Source Record issued by ${issuer}.`,
      );
}

function validateWaiver(
  controlPoint: ControlPoint,
  sources: readonly SourceRecord[],
  now: Date,
): void {
  const waiver = controlPoint.waiver;
  if (waiver === undefined)
    throw invalidEvidence(
      'GT_CONTROL_POINT_WAIVER_MISSING',
      'Waived Control Point lacks a waiver.',
    );
  const source = sources.find((candidate) => candidate.id === waiver.sourceRecordId);
  if (source === undefined)
    throw invalidEvidence(
      'GT_CONTROL_POINT_WAIVER_SOURCE_MISSING',
      'Waiver references a missing Source Record.',
    );
  if (!['authorized-human', 'policy-system'].includes(source.issuer.type))
    throw invalidEvidence(
      'GT_CONTROL_POINT_WAIVER_ISSUER',
      'Waiver Source Record must be issued by an authorized human or policy system.',
    );
  if (source.result !== 'approved')
    throw invalidEvidence(
      'GT_CONTROL_POINT_WAIVER_RESULT',
      'Waiver Source Record is not approved.',
    );
  if (
    source.subject.revision !== controlPoint.revision ||
    waiver.revision !== controlPoint.revision
  )
    throw invalidEvidence(
      'GT_CONTROL_POINT_WAIVER_REVISION',
      'Waiver and Source Record must match the Control Point revision.',
    );
  const expiry = Math.min(
    Date.parse(waiver.expiresAt),
    Date.parse(source.expiresAt ?? waiver.expiresAt),
  );
  if (!Number.isFinite(expiry) || expiry <= now.valueOf())
    throw invalidEvidence('GT_CONTROL_POINT_WAIVER_EXPIRED', 'Waiver Source Record is expired.');
  if (
    controlPoint.requiredSourceTypes.length > 0 &&
    !controlPoint.requiredSourceTypes.includes(source.sourceType)
  )
    throw invalidEvidence(
      'GT_CONTROL_POINT_WAIVER_TYPE',
      'Waiver Source Record has an unaccepted source type.',
    );
  if (
    controlPoint.requiredIssuers.length > 0 &&
    !controlPoint.requiredIssuers.includes(source.issuer.id)
  )
    throw invalidEvidence(
      'GT_CONTROL_POINT_WAIVER_ISSUER',
      'Waiver Source Record has an unaccepted issuer.',
    );
}

function invalidEvidence(code: string, message: string): GroundtrailError {
  return new GroundtrailError(code, message, 1);
}
