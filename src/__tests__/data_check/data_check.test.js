import data_check from './javascript/data_check'

describe('guess_region_type', () => {

    test('returns "county" when all ecodes are only counties and shared', () => {
        const data = {1: {ecode: "E10000003"}, 2: {ecode: "E06000001"}};
        const result = data_check.guess_region_type(data);
        expect(result).toBe('county');
    });

    test('returns "la" when all ecodes are only las and shared', () => {
        const data = {1: {ecode: "E07000008"}, 2: {ecode: "E06000001"}};
        const result = data_check.guess_region_type(data);
        expect(result).toBe('la');
    });

    test('logs "both county and la" if mixed types are found', () => {
        const data = {1: {ecode: "E07000008"}, 2: {ecode: "E10000003"}};
        expect(() => data_check.guess_region_type(data)).toThrow(data_check.EcodeParseError);
        expect(() => data_check.guess_region_type(data)).toThrow("Multiple types of LA")
    });

    test('returns null if no specific LAs found', () => {
        const data = {1: {ecode: "E06000001"}};
        const result = data_check.guess_region_type(data);
        expect(result).toBeNull();
    });

    test('returns null for empty data', () => {
        const data = {};
        const result = data_check.guess_region_type(data);
        expect(result).toBeNull();
    });
});

describe("guess data type", () => {
    test('only integers returns int', () => {
        const data = [{data: "2"}, {data: "42"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('integer');
    });

    test('only floats returns float', () => {
        const data = [{data: "3.1"}, {data: "0.00735"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('float');
    });

    test('integer and float returns float', () => {
        const data = [{data: "1"}, {data: "6.5"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('float');
    });

    test('integers with NA returns int', () => {
        const data = [{data: "2"}, {data: "Na"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('integer');
    });

    test('integers with NA returns int', () => {
        const data = [{data: "2"}, {data: "Na"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('integer');
    });

    test('only strings returns string', () => {
        const data = [{data: "1a"}, {data: "b"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('string');
    });

    test('string and int returns string', () => {
        const data = [{data: "a"}, {data: "1"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('string');
    });

    test('string and float returns string', () => {
        const data = [{data: "1.a"}, {data: "0.2"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('string');
    });

    test('only nas returns string', () => {
        const data = [{data: "na"}, {data: "N/a"}];
        const result = data_check.guess_data_type(data);
        expect(result).toBe('string');
    });
})