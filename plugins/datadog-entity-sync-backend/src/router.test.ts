import { parseEntityFilterString } from './router';

describe('parseEntityFilterString', () => {
  describe('with valid input', () => {
    it('should parse the filter to an entity query', () => {
      const result = parseEntityFilterString(
        'metadata.name=service-name,kind=application',
      );
      expect(result).toEqual({
        'metadata.name': 'service-name',
        kind: 'application',
      });
    });

    it('should allow empty searches', () => {
      const result = parseEntityFilterString('');
      expect(result).toEqual({});
    });

    it('should allow searching of blank keys', () => {
      const result = parseEntityFilterString('metadata.name=');
      expect(result).toEqual({
        'metadata.name': '',
      });
    });

    it('should trim out extra whitespace', () => {
      const result = parseEntityFilterString(
        '  metadata.name  = service-name  ,  kind  =  application  ',
      );
      expect(result).toEqual({
        'metadata.name': 'service-name',
        kind: 'application',
      });
    });
  });

  describe('with invalid input', () => {
    ['=', '=,', '=,,', ',=,==,'].forEach(invalidInput => {
      it(`should fail with invalid input of '${invalidInput}'`, () => {
        expect(() => parseEntityFilterString(invalidInput)).toThrow(Error);
      });
    });
  });
});
