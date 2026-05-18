import { describe, it, expect } from 'vitest'
import { parseTheoryContent } from '../src/utils/parseTheoryContent'

describe('parseTheoryContent', () => {
  it('returns empty array for null/undefined/empty input', () => {
    expect(parseTheoryContent(null)).toEqual([])
    expect(parseTheoryContent(undefined)).toEqual([])
    expect(parseTheoryContent('')).toEqual([])
  })

  it('parses HTML without code blocks as single html segment', () => {
    const result = parseTheoryContent('<p>Hello World</p>')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('html')
    expect(result[0].content).toBe('<p>Hello World</p>')
  })

  it('parses code block with language', () => {
    const html = '<p>Intro</p><pre><code class="language-python">print("hello")</code></pre><p>Outro</p>'
    const result = parseTheoryContent(html)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ type: 'html', content: '<p>Intro</p>' })
    expect(result[1]).toEqual({ type: 'code', language: 'python', content: 'print("hello")' })
    expect(result[2]).toEqual({ type: 'html', content: '<p>Outro</p>' })
  })

  it('parses code block without language as plaintext', () => {
    const html = '<pre><code>some code</code></pre>'
    const result = parseTheoryContent(html)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('code')
    expect(result[0].language).toBe('plaintext')
    expect(result[0].content).toBe('some code')
  })

  it('decodes HTML entities in code blocks', () => {
    const html = '<pre><code class="language-js">if (a &lt; b) &amp;&amp; c</code></pre>'
    const result = parseTheoryContent(html)

    expect(result[0].content).toBe('if (a < b) && c')
  })

  it('decodes all common HTML entities', () => {
    const html = '<pre><code>&lt;div&gt; &amp; &quot;quoted&quot; &#39;apostrophe&#39;&nbsp;space</code></pre>'
    const result = parseTheoryContent(html)

    expect(result[0].content).toBe('<div> & "quoted" \'apostrophe\' space')
  })

  it('handles multiple code blocks', () => {
    const html = '<pre><code class="language-python">a = 1</code></pre><p>text</p><pre><code class="language-js">let b = 2</code></pre>'
    const result = parseTheoryContent(html)

    expect(result).toHaveLength(3)
    expect(result[0].language).toBe('python')
    expect(result[1].type).toBe('html')
    expect(result[2].language).toBe('js')
  })

  it('handles code block at the start', () => {
    const html = '<pre><code class="language-python">code</code></pre><p>after</p>'
    const result = parseTheoryContent(html)

    expect(result[0].type).toBe('code')
    expect(result[1].type).toBe('html')
  })

  it('handles code block at the end', () => {
    const html = '<p>before</p><pre><code class="language-python">code</code></pre>'
    const result = parseTheoryContent(html)

    expect(result[0].type).toBe('html')
    expect(result[1].type).toBe('code')
  })

  it('handles code block as only content', () => {
    const html = '<pre><code class="language-python">only code</code></pre>'
    const result = parseTheoryContent(html)

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('code')
  })

  it('preserves whitespace inside code blocks', () => {
    const html = '<pre><code class="language-python">def hello():\n    print("hi")</code></pre>'
    const result = parseTheoryContent(html)

    expect(result[0].content).toContain('\n    ')
  })

  it('handles pre with attributes', () => {
    const html = '<pre class="code-block"><code class="language-python">code</code></pre>'
    const result = parseTheoryContent(html)

    expect(result[0].type).toBe('code')
    expect(result[0].language).toBe('python')
  })

  it('handles code with additional attributes', () => {
    const html = '<pre><code class="language-python highlight">code</code></pre>'
    const result = parseTheoryContent(html)

    expect(result[0].language).toBe('python')
  })
})
