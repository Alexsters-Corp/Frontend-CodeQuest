import { describe, it, expect } from 'vitest'
import { normalizeCodeExerciseAnswer, buildExecutionSource } from '../src/utils/lessonAnswers'

describe('lessonAnswers utils', () => {
  describe('normalizeCodeExerciseAnswer', () => {
    it('returns empty string for empty answer', () => {
      expect(normalizeCodeExerciseAnswer({}, '')).toBe('')
      expect(normalizeCodeExerciseAnswer({}, null)).toBe('')
      expect(normalizeCodeExerciseAnswer({}, undefined)).toBe('')
    })

    it('returns trimmed answer for non-completar_codigo exercises', () => {
      const exercise = { tipo: 'opcion_multiple' }
      expect(normalizeCodeExerciseAnswer(exercise, '  answer  ')).toBe('answer')
    })

    it('returns trimmed answer when base code has no blank', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'print(x)' }
      expect(normalizeCodeExerciseAnswer(exercise, '  answer  ')).toBe('answer')
    })

    it('returns trimmed answer for single line without newline', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'print(_____)' }
      expect(normalizeCodeExerciseAnswer(exercise, 'x')).toBe('x')
    })

    it('extracts answer from full code submission with newline', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'print(_____)' }
      const result = normalizeCodeExerciseAnswer(exercise, 'print(x)\n')
      expect(result).toBe('x')
    })

    it('extracts answer from console.log with newline', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'console.log(_____)' }
      const result = normalizeCodeExerciseAnswer(exercise, 'console.log(resultado)\n')
      expect(result).toBe('resultado')
    })

    it('extracts answer from System.out.println with newline', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'System.out.println(_____)' }
      const result = normalizeCodeExerciseAnswer(exercise, 'System.out.println(total)\n')
      expect(result).toBe('total')
    })

    it('extracts answer from Console.WriteLine with newline', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'Console.WriteLine(_____)' }
      const result = normalizeCodeExerciseAnswer(exercise, 'Console.WriteLine(mensaje)\n')
      expect(result).toBe('mensaje')
    })

    it('extracts answer from cout with newline', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'std::cout << _____ << std::endl' }
      const result = normalizeCodeExerciseAnswer(exercise, 'std::cout << total << std::endl\n')
      expect(result).toBe('total')
    })

    it('handles strict match with prefix and suffix and newline', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'const x = _____;' }
      const result = normalizeCodeExerciseAnswer(exercise, 'const x = 42;\n')
      expect(result).toBe('42')
    })

    it('handles multiline submission', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'print(_____)' }
      const result = normalizeCodeExerciseAnswer(exercise, 'print(\n  resultado\n)')
      expect(result).toBe('resultado')
    })

    it('returns full trimmed answer when no extraction possible', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'print(_____)' }
      const result = normalizeCodeExerciseAnswer(exercise, 'some random text')
      expect(result).toBe('some random text')
    })
  })

  describe('buildExecutionSource', () => {
    it('returns empty string for empty answer', () => {
      expect(buildExecutionSource({}, '')).toBe('')
      expect(buildExecutionSource({}, null)).toBe('')
    })

    it('returns raw answer for non-completar_codigo exercises', () => {
      const exercise = { tipo: 'opcion_multiple' }
      expect(buildExecutionSource(exercise, 'answer')).toBe('answer')
    })

    it('returns raw answer when base code has no blank', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'print(x)' }
      expect(buildExecutionSource(exercise, 'answer')).toBe('answer')
    })

    it('returns raw answer for multiline submission', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'print(_____)' }
      expect(buildExecutionSource(exercise, 'print(\n  x\n)')).toBe('print(\n  x\n)')
    })

    it('replaces blank with answer for single token', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'print(_____)' }
      const result = buildExecutionSource(exercise, 'x')
      expect(result).toBe('print(x)')
    })

    it('replaces multiple blanks', () => {
      const exercise = { tipo: 'completar_codigo', codigo_base: 'a = _____\nprint(a + _____)' }
      const result = buildExecutionSource(exercise, '5')
      expect(result).toBe('a = 5\nprint(a + 5)')
    })
  })
})
