import { describe, expect, it } from 'vitest';
import { parseSkillFrontmatter } from '../../src/core/frontmatter.js';
import { GroundtrailParseError, parseBoundedJson } from '../../src/core/json.js';

describe('bounded parsers', () => {
  it('rejects duplicate JSON members and unsafe numbers before parsing', () => {
    expect(() => parseBoundedJson('{"a":1,"a":2}')).toThrow(GroundtrailParseError);
    expect(() => parseBoundedJson('{"n":9007199254740992}')).toThrow(GroundtrailParseError);
    expect(() => parseBoundedJson('{"n":-0}')).toThrow(GroundtrailParseError);
    expect(() => parseBoundedJson('{"n":0.1}')).toThrow(GroundtrailParseError);
  });

  it('accepts valid frontmatter and rejects non-string metadata', () => {
    expect(
      parseSkillFrontmatter(
        '---\nname: groundtrail-demo\ndescription: Demonstrates bounded metadata.\nmetadata:\n  key: value\n---\n# Demo\n',
      ).name,
    ).toBe('groundtrail-demo');
    expect(() =>
      parseSkillFrontmatter(
        '---\nname: groundtrail-demo\ndescription: x\nmetadata:\n  key: 2\n---\n',
      ),
    ).toThrow(/metadata/i);
  });
});

it('rejects JSON that contains a lone surrogate', () => {
  expect(() => parseBoundedJson(String.raw`{"text":"\ud800"}`)).toThrow(GroundtrailParseError);
});
