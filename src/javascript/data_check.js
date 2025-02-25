const only_county = ['E10000003', 'E10000007', 'E10000008', 'E10000011', 'E10000012', 'E10000013', 'E10000014', 'E10000015', 'E10000016', 'E10000017', 'E10000018', 'E10000019', 'E10000020', 'E10000024', 'E10000025', 'E10000028', 'E10000029', 'E10000030', 'E10000031', 'E10000032', 'E10000034'];
const only_la = ['E07000008', 'E07000009', 'E07000010', 'E07000011', 'E07000012', 'E07000032', 'E07000033', 'E07000034', 'E07000035', 'E07000036', 'E07000037', 'E07000038', 'E07000039', 'E07000040', 'E07000041', 'E07000042', 'E07000043', 'E07000044', 'E07000045', 'E07000046', 'E07000047', 'E07000061', 'E07000062', 'E07000063', 'E07000064', 'E07000065', 'E07000066', 'E07000067', 'E07000068', 'E07000069', 'E07000070', 'E07000071', 'E07000072', 'E07000073', 'E07000074', 'E07000075', 'E07000076', 'E07000077', 'E07000078', 'E07000079', 'E07000080', 'E07000081', 'E07000082', 'E07000083', 'E07000084', 'E07000085', 'E07000086', 'E07000087', 'E07000088', 'E07000089', 'E07000090', 'E07000091', 'E07000092', 'E07000093', 'E07000094', 'E07000095', 'E07000096', 'E07000098', 'E07000099', 'E07000102', 'E07000103', 'E07000105', 'E07000106', 'E07000107', 'E07000108', 'E07000109', 'E07000110', 'E07000111', 'E07000112', 'E07000113', 'E07000114', 'E07000115', 'E07000116', 'E07000117', 'E07000118', 'E07000119', 'E07000120', 'E07000121', 'E07000122', 'E07000123', 'E07000124', 'E07000125', 'E07000126', 'E07000127', 'E07000128', 'E07000129', 'E07000130', 'E07000131', 'E07000132', 'E07000133', 'E07000134', 'E07000135', 'E07000136', 'E07000137', 'E07000138', 'E07000139', 'E07000140', 'E07000141', 'E07000142', 'E07000143', 'E07000144', 'E07000145', 'E07000146', 'E07000147', 'E07000148', 'E07000149', 'E07000170', 'E07000171', 'E07000172', 'E07000173', 'E07000174', 'E07000175', 'E07000176', 'E07000177', 'E07000178', 'E07000179', 'E07000180', 'E07000181', 'E07000192', 'E07000193', 'E07000194', 'E07000195', 'E07000196', 'E07000197', 'E07000198', 'E07000199', 'E07000200', 'E07000202', 'E07000203', 'E07000207', 'E07000208', 'E07000209', 'E07000210', 'E07000211', 'E07000212', 'E07000213', 'E07000214', 'E07000215', 'E07000216', 'E07000217', 'E07000218', 'E07000219', 'E07000220', 'E07000221', 'E07000222', 'E07000223', 'E07000224', 'E07000225', 'E07000226', 'E07000227', 'E07000228', 'E07000229', 'E07000234', 'E07000235', 'E07000236', 'E07000237', 'E07000238', 'E07000239', 'E07000240', 'E07000241', 'E07000242', 'E07000243', 'E07000244', 'E07000245'];

class EcodeParseError extends Error {
    constructor(message, ecodes) {
        super(message);
        this.ecodes = ecodes;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class UnknownEcode extends EcodeParseError {
    constructor(message, ecodes) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class DuplicateRow extends Error {
    constructor(message, row) {
        super(message);
        this.rows = row;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

// 
function check_duplicate_rows(data, index){
    // run through rows and make array of keys
    var keys = [];
    const map = new Map();
    const duplicates = [];
    for (let d of data) {
        if (d[index].trim() != "") {
            keys.push(d[index])
        }
    }
    keys.forEach(item => {
        const t = item.trim()
        if (map.has(t)) {
            if (map.get(t) === 1) {
                duplicates.push(t);
            }
            map.set(t, map.get(t) + 1);
        } else {
            map.set(t, 1);
        }
    })

    if (duplicates.length === 0) {
        return 1
    } else {
        throw new DuplicateRow("Duplicate row", duplicates)
    }
}

function guess_region_type(data) {
    // This will need updating when there are more datasets
    var region_type = null;
    var counties = [];
    var districts = [];
    // This is a little slow but gives transpasrent errors
    for (const d in data) {
        const datum = data[d];
        if (only_county.includes(datum.ecode)) {
            counties.push(datum.ecode);
        } else if (only_la.includes(datum.ecode)) {
            districts.push(datum.ecode);
        }
    }
    const counties_len = counties.length;
    const districts_len = districts.length;
    if (counties_len > 0 & districts_len > 0) {
        throw new EcodeParseError("Both Counties and Districts", {"counties": counties,
                                                              "districts": districts
        })
    } else if (counties_len > 0) {
        return "county";
    } else if (districts_len > 0) {
        return "district";
    } else {
        return null;
    }
}

function guess_data_type(data) {
    // perform very simple data type guessing
    const datacol = data.map(d => d.data.toString().toUpperCase());
    const nas = ["NA", "N/A", "N.A", "NAN", "-", "."];
    // how is there not a builtin for this?
    // Everything is text, int, float or NA. 

    const isNa = str => nas.includes(str.toUpperCase());
    const isInteger = str => /^-?\d+$/.test(str) ;
    const isFloat = str => /^-?\d*(\.\d+)?$/.test(str);

    let allNa = true;
    let allInt = true;
    let allFloat = true;

    for (const str of datacol) {
        if (!nas.includes(str)) {
            allNa = false;
                if(!isInteger(str)) {
                    allInt = false;
                
                if (!isFloat(str)) {
                    allFloat = false;
                    break
                }
            }
        }
    }

    if (allNa) return 'string';
    if (allInt) return 'integer';
    if (allFloat) return 'float';
    return 'string';
}


const data_check = {
    guess_region_type,
    guess_data_type,
    check_duplicate_rows,
    DuplicateRow,
    EcodeParseError
}

export default data_check