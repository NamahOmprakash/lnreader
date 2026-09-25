import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeChapter } from '../sanitizer.ts';

describe('LNReader App Chapter Sanitizer', () => {
  it('strips elements with display:none and honeypot classes', () => {
    const rawHtml = `
      <div>
        <p>Visible sentence 1.</p>
        <p style="display: none;">Invisible honey-pot trap text!</p>
        <div style="font-size: 0px;">Another stealth bot detector</div>
        <p class="tts-trap">Decoy paragraph for scrapers</p>
        <p>Visible sentence 2.</p>
      </div>
    `;

    const result = sanitizeChapter(rawHtml);

    assert.ok(result.cleanHtml.includes('Visible sentence 1.'));
    assert.ok(result.cleanHtml.includes('Visible sentence 2.'));
    assert.ok(!result.cleanHtml.includes('Invisible honey-pot trap text!'));
    assert.ok(!result.cleanHtml.includes('Another stealth bot detector'));
    assert.ok(!result.cleanHtml.includes('Decoy paragraph for scrapers'));
  });

  it('unwraps fragmented spans and removes zero-width characters for smooth TTS', () => {
    const rawHtml = `
      <p><span>T\u200Bh\u200Be</span> <span>spell</span> <span>h\uFEFFas</span> <span>begun.</span></p>
    `;

    const result = sanitizeChapter(rawHtml);

    assert.ok(!result.cleanHtml.includes('<span>'));
    assert.ok(!result.cleanHtml.includes('\u200B'));
    assert.ok(!result.cleanHtml.includes('\uFEFF'));
    assert.strictEqual(result.cleanText, 'The spell has begun.');
  });

  it('removes adjacent cloned paragraphs (fixes TTS double-reading trap)', () => {
    const rawHtml = `
      <div id="content">
        <p>Sunny crept cautiously through the dark obsidian corridor.</p>
        <p>Sunny crept cautiously through the dark obsidian corridor.</p>
        <p>He listened for the faintest breathing of the nightmare creature.</p>
      </div>
    `;

    const result = sanitizeChapter(rawHtml);

    const matches = (result.cleanHtml.match(/Sunny crept cautiously/g) || []).length;
    assert.strictEqual(matches, 1, 'Should only contain Sunny crept once');
    assert.ok(result.cleanHtml.includes('nightmare creature'));
  });

  it('flags anomaly when high levels of filler text or extreme duplicates occur', () => {
    const rawHtml = `
      <div>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        <p>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      </div>
    `;

    const result = sanitizeChapter(rawHtml);
    assert.strictEqual(result.isClean, false);
    assert.strictEqual(result.anomalyReport.isAnomaly, true);
    assert.ok(result.anomalyReport.reasons.some(r => r.includes('Lorem ipsum')));
  });
});
