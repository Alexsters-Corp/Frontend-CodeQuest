import { describe, it, expect } from 'vitest'
import {
  detectLanguageMismatch,
  getLanguageConfig,
  getMonacoLanguageFromLesson,
  getLanguageLabelFromLesson,
  LANGUAGE_CONFIG,
} from '../src/utils/languages'

describe('languages utils', () => {
  describe('LANGUAGE_CONFIG', () => {
    it('has all expected languages', () => {
      expect(LANGUAGE_CONFIG[1].slug).toBe('python')
      expect(LANGUAGE_CONFIG[2].slug).toBe('javascript')
      expect(LANGUAGE_CONFIG[3].slug).toBe('java')
      expect(LANGUAGE_CONFIG[4].slug).toBe('cpp')
      expect(LANGUAGE_CONFIG[5].slug).toBe('csharp')
    })

    it('each language has required fields', () => {
      Object.values(LANGUAGE_CONFIG).forEach((lang) => {
        expect(lang.id).toBeDefined()
        expect(lang.slug).toBeDefined()
        expect(lang.monaco).toBeDefined()
        expect(lang.label).toBeDefined()
      })
    })
  })

  describe('detectLanguageMismatch', () => {
    it('returns null for empty code', () => {
      expect(detectLanguageMismatch('', 'python')).toBeNull()
      expect(detectLanguageMismatch(null, 'python')).toBeNull()
    })

    it('returns null for empty expectedSlug', () => {
      expect(detectLanguageMismatch('print("hi")', '')).toBeNull()
      expect(detectLanguageMismatch('print("hi")', null)).toBeNull()
    })

    it('detects JavaScript code when expecting Python', () => {
      const result = detectLanguageMismatch('console.log("hello")', 'python')
      expect(result).toBe('JavaScript')
    })

    it('detects Python code when expecting JavaScript', () => {
      const result = detectLanguageMismatch('print("hello")', 'javascript')
      expect(result).toBe('Python')
    })

    it('detects Java code when expecting Python', () => {
      const result = detectLanguageMismatch('System.out.println("hello")', 'python')
      expect(result).toBe('Java')
    })

    it('detects C++ code when expecting Python', () => {
      const result = detectLanguageMismatch('#include <iostream>', 'python')
      expect(result).toBe('C++')
    })

    it('detects C# code when expecting Python', () => {
      const result = detectLanguageMismatch('Console.WriteLine("hello")', 'python')
      expect(result).toBe('C#')
    })

    it('returns null when code matches expected language', () => {
      expect(detectLanguageMismatch('print("hello")', 'python')).toBeNull()
      expect(detectLanguageMismatch('console.log("hello")', 'javascript')).toBeNull()
    })

    it('detects function keyword in JavaScript', () => {
      expect(detectLanguageMismatch('function hello() {}', 'python')).toBe('JavaScript')
    })

    it('detects const/let/var in JavaScript', () => {
      expect(detectLanguageMismatch('const x = 1', 'python')).toBe('JavaScript')
    })

    it('detects def in Python', () => {
      expect(detectLanguageMismatch('def hello():', 'javascript')).toBe('Python')
    })

    it('detects public class in Java', () => {
      expect(detectLanguageMismatch('public class Main {}', 'python')).toBe('Java')
    })
  })

  describe('getLanguageConfig', () => {
    it('returns correct config for python', () => {
      const config = getLanguageConfig(1)
      expect(config.slug).toBe('python')
      expect(config.monaco).toBe('python')
      expect(config.label).toBe('Python')
    })

    it('returns correct config for javascript', () => {
      const config = getLanguageConfig(2)
      expect(config.slug).toBe('javascript')
      expect(config.monaco).toBe('javascript')
    })

    it('returns default for null id', () => {
      const config = getLanguageConfig(null)
      expect(config.slug).toBe('javascript')
    })

    it('returns default for undefined id', () => {
      const config = getLanguageConfig(undefined)
      expect(config.slug).toBe('javascript')
    })

    it('returns default for invalid id', () => {
      const config = getLanguageConfig(99)
      expect(config.slug).toBe('javascript')
    })

    it('returns default for zero', () => {
      const config = getLanguageConfig(0)
      expect(config.slug).toBe('javascript')
    })

    it('handles string id', () => {
      const config = getLanguageConfig('1')
      expect(config.slug).toBe('python')
    })
  })

  describe('getMonacoLanguageFromLesson', () => {
    it('returns python for id 1', () => {
      expect(getMonacoLanguageFromLesson(1)).toBe('python')
    })

    it('returns javascript for id 2', () => {
      expect(getMonacoLanguageFromLesson(2)).toBe('javascript')
    })

    it('returns default for null', () => {
      expect(getMonacoLanguageFromLesson(null)).toBe('javascript')
    })
  })

  describe('getLanguageLabelFromLesson', () => {
    it('returns Python for id 1', () => {
      expect(getLanguageLabelFromLesson(1)).toBe('Python')
    })

    it('returns JavaScript for id 2', () => {
      expect(getLanguageLabelFromLesson(2)).toBe('JavaScript')
    })

    it('returns default for null', () => {
      expect(getLanguageLabelFromLesson(null)).toBe('JavaScript')
    })
  })
})
