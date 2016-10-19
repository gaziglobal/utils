"use strict"
/**
 * Fikret Burak Gazioglu || GaziGlobal Turizm ve Bilgi Teknolojileri A.S || July 2016
 *
 * utils library , functions which are used by all flight provider apis.
 * These functions are general and should not be changed by project bases. Only global functions
 * which are used in all project must be added here.
 *
 *
 * ToDefault
 *      -Checks element and if null or empty returns default values
 *          optional - if variable is object object map can be supplied with '>' seperation
 * CompareArrays
 *      - Compares values of 2 arrays
 *
 *
 * GetNested
 *      - JavaScript: Accessing Nested Object Properties Using a String.
 *
 *
 * Unify
 *       - To unify array of array generated from async.map result
 *
 *
 * ObjectArrayGetDuplicate
 *       - Returns the duplicte key of same object , compared with propertyList values
 *
 *
 * FlightsUnify
 *       - Transforms an array of array Flights to array and removes duplicates
 *
 *
 * IsArrayNullorEmpty
 *      - Checks if array is empty or null
 *
 *
 * GroupBy
 *      -G roups the array with the given element key
 *
 *
 * AsyncMapErrorCheck
 *      - Checks for error or null array
 *
 *
 *
 * ConvertDateTime
 *      - To convert given datetime string to given format
 *
 *
 * Node
 *      - To parse XML files lightweight. It parses files manually,  you only get what you need
 *
 *
 * Log
 *       - Logging mechanism  , right now it is set to write in FS.
 *
 *
 * CorrectCode
 *  uses config.provider.destinationCleaner array for conversion
 *      - Some airlines only fly to certain airports so if user for say searches for IST and that
 *        airline is only flying to IST Atrk, than the search codes are replaced
 *
 *
 * ConvertPassengerCode
 *  uses config.***.passengerTypes lists to convert codes.
 *      - Passenger codes are converted between KY and airline codes.
 *
 *
 * FlightTime
 *      - Gets the departure and arrival time of and generates the Total Travel Time string.
 *        Output format is for now '14sa 45dak'. = HH'sa' mm'dak'
 *
 *
 * Error
 *      - Creates the Error object which is going to be send out
 *
 */

const config = require('config');
const fs = require('fs'); // Required for only logging purposes
const logdir = `${__dirname}/logs`; // Requires for only logging purposes
const errorMap = global.appRequire('error/codes');
const flightModel = global.appRequire('models/searchFlight');


/**
 * Checks element and if null or empty returns default values
 *  optional - if variable is object object map can be supplied with '>' seperation
 * @param {} v - variable to check
 * @param {} d - default to returned if variable empty||object element null
 * @param String e - If object map , seperated by '>'
 *
 * @returns {}
 */
function ToDefault(v, d, e) {
    let r = '';
    if (v) {
        if (e) {
            const m = e.split('>');
            let i = v;
            for (let a = 0; a < m.length; a++) {
                if (a + 1 === m.length) {
                    r = i[m[a]];
                    break;
                }
                i = i[m[a]];
                if (!i) {
                    break;
                }
            }
        } else {
            r = v;
        }
    }
    if (!r || r === '' || r === undefined || r === null) {
        return d;
    }
    return r;
}


/**
 *
 */
function ReindexArray(from, to, array) {
    return array.splice(to, 0, array.splice(from, 1)[0]);
}

/**
 * Compares values of 2 arrays
 * @param [] array1 - Array to compare
 * @param [] array2 - Array to compare
 *
 * @returns Boolean true or false
 */
function CompareArrays(array1, array2) {
    if (array1.length !== array2.length) {
        return false;
    }
    for (let a = 0; a < array1.length; a++) {
        if (array2.indexOf(array1[a]) === -1) {
            return false;
        }
    }
    return true;
}
/**
 * JavaScript: Accessing Nested Object Properties Using a String.
 * http://blog.nicohaemhouts.com/2015/08/03/accessing-nested-javascript-objects-with-string-key/
 * @param {} object - object to look for values
 * @param String - Path of the property
 *
 * @returns Value
 */
function GetNested(theObject, path) {
    try {
        const separator = '.';

        return path.
        replace('[', separator).replace(']', '').
        split(separator).
        reduce(
            (obj, property) => (obj[property]), theObject
        );
    } catch (err) {
        return undefined;
    }
}


/**
 * Transforms an array of array to array
 * @param {[]} a - Array of Array
 *
 * @returns {[]]} Array of Array is merged into single array
 */
function Unify(a) {
    let b = [];
    a.forEach((e) => {
        if (e) {
            b = b.concat(e);
        }
    });
    if (b.length < 1) {
        return null;
    }
    return b;
}


/**
 * Returns the duplicte key of same object , compared with propertyList values
 * @param {[]} a - Array
 * @param {} object - object to compared
 * @param [] propertyList - Which properties we should compare
 *
 * @returns {Number} Index of duplicate or null if none
 */
function ObjectArrayGetDuplicate(array, object, propertyList) {
    let found = false;
    array.forEach((element, index) => {
        propertyList.forEach((property) => {
            if (element[property] !== object[property]) {
                found = false;
                return;
            }
            found = true;
        });
        if (found) {
            return index;
        }
    });
    return null;
}


/**
 * Transforms an array of array Flights to array and removes duplicates
 * @param {[]} a - Array of Array of FLights
 *
 * @returns {[]]} Array of Array is merged into single array with removed duplicates
 */
function FlightsUnify(a) {
    let b = [];
    // Incoming array is array of array of flights
    a.forEach((e) => {
        if (e) { // If not null ,can be null since it is coming from async.map
            if (b.length === 0) { // If it is the first iteration than add it right away
                b = b.concat(e);
                return;
            }
            e.forEach((flightToAdd) => { // Compare the list with the current list
                let inList = false;
                b.forEach((flightInList, index) => {
                    if (flightInList.Id() === flightToAdd.Id()) { // We comapre the ids
                        inList = true;
                        if (flightInList.Tutar > flightToAdd.Tutar) { // If the price is cheaper we add
                            b[index] = flightToAdd;
                            // TODO - FareInfo eklemek gerekiyor
                        }
                    }
                });
                if (!inList) { // It is not in list add it
                    b.push(flightToAdd);
                }
            });
        }
    });
    if (b.length < 1) {
        // TODO - ERROR
        return null;
    }
    return b;
}


/**
 * Checks if array is empty or null
 * @param {[]} array - Array to Checks
 *
 * @returns {Boolean} true if empty false if not
 */
function IsArrayNullorEmpty(array) {
    if (!array) {
        return true;
    }
    if (array.length < 1) {
        return true;
    }
    return false;
}

/**
 * Groups the array with the given element key
 * @param{Array} array - Array to groups
 * @param {String} key - Elemtents name to gourpby
 *
 * @returns {[Object]} Returns array of object
 */
function GroupBy(array, key) {
    const groups = [];
    array.forEach((element, index) => {
        const keyOfElement = Number.isInteger(element[key]) ? element[key] : index;
        if (!groups[keyOfElement]) { // if empty we create
            groups[keyOfElement] = [];
        }
        groups[keyOfElement].push(element);
    });
    return groups;
}

/**
 * Checks for error or null array
 *
 * @returns callback or results array
 */
function AsyncMapErrorCheck(err, result) {
    if (err) {
        return err;
    }
    const results = Unify(result);
    if (!results) {
        return err;
    }
    return results;
}

/**
 * Converts date format to 'outputFormat' parameter
 * Converts time format to 'outputTimeFormat' parameter
 * @param {String} date                 - Original date string
 * @param {String} format               - Original date format
 * @param {String} outputFormat         - Date format to be send
 * @param {String} [time]                 - Optional, input time
 * @param {String} [outputTimeFormat]     - time format to be send back
 * @returns {date: [string] , time : [string] }
 */
function ConvertDateTime(date, format, outputFormat, time, outputTimeFormat) {
    let d = ''; // Date to be send
    let t = ''; // Time to be send
    let day = '';
    let month = '';
    let year = '';
    let hour = '';
    let minute = '';

    // First split date string into day month and year string
    // also if there is time it is seperated as well
    switch (format) {
        case 'ddMMyyyy':
            day = date.substring(0, 2);
            month = date.substring(2, 4);
            year = date.substring(4, 8);
            break;
        case 'dd-MM-yyyy':
            day = date.substring(0, 2);
            month = date.substring(3, 5);
            year = date.substring(6, 10);
            break;
        case 'yyyyMMdd':
            day = date.substring(6, 8);
            month = date.substring(4, 6);
            year = date.substring(0, 4);
            break;
        case 'yyyy-MM-dd':
            day = date.substring(8, 10);
            month = date.substring(5, 7);
            year = date.substring(0, 4);
            break;
        case 'ddMMyyyyThhmmss':
            day = date.substring(0, 2);
            month = date.substring(2, 4);
            year = date.substring(4, 8);
            t = date.substring(9, 15);
            break;
        case 'yyyyMMddThhmmss':
            day = date.substring(6, 8);
            month = date.substring(4, 6);
            year = date.substring(0, 4);
            t = date.substring(9, 15);
            break;
        case 'yyyy-MM-ddThh:mm:ss':
            day = date.substring(8, 10);
            month = date.substring(5, 7);
            year = date.substring(0, 4);
            hour = date.substring(11, 13);
            minute = date.substring(14, 16);
            break;
        case 'yyyy-MM-ddThh:mm:ss+03:00':
            day = date.substring(8, 10);
            month = date.substring(5, 7);
            year = date.substring(0, 4);
            hour = date.substring(11, 13);
            minute = date.substring(14, 16);
            break;
        default:
            break;
    }

    // Divide time into hour and minute
    if (t) {
        hour = t.substring(0, 2);
        minute = t.substring(3, 5);
    }
    // Which means we want the month in 3 letter text
    if (outputFormat.indexOf('T') === 0) {
        const monthArray = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];
        month = monthArray[month - 1];
    }
    // Convert date to given format
    switch (outputFormat) {
        case 'ddMMyyyy':
            d = day + month + year;
            break;
        case 'dd-MM-yyyy':
            d = `${day}-${month}-${year}`;
            break;
        case 'yyyyMMdd':
            d = `${year}${month}${day}`;
            break;
        case 'yyyy-MM-dd':
            d = `${year}-${month}-${day}`;
            break;
        case 'ddMMyyyyThhmm':
            d = `${day}${month}${year}T${hour}${minute}`;
            break;
        case 'dd-MM-yyyyThh:mm:ss+03:00':
            d = `${day}-${month}-${year}T${hour}:${minute}:00+03:00`;
            break;
        case 'ddMMyyyyThhmmss+03:00':
            d = `${day}${month}${year}T${hour}${minute}00+03:00`;
            break;
        case 'yyyy-MM-ddThh:mm:ss+03:00':
            d = `${year}-${month}-${day}T${hour}:${minute}:00+03:00`;
            break;
        case 'TddMMyy':
            d = `${day}${month}${year}`;
            break;
        default:
            break;
    }

    // Convert time into given format
    switch (outputTimeFormat) {
        case 'hh:mm':
            t = `${hour}:${minute}`;
            break;
        case 'hh:mm:ss':
            t = `${hour}:${minute}:00`;
            break;
        case 'hh:mm:ss+03:00':
            t = `${hour}:${minute}:00+03:00`;
            break;
        case 'hhmm':
            t = `${hour}${minute}`;
            break;
        case 'hhmmss':
            t = `${hour}${minute}00`;
            break;
        case 'hhmmss+0300':
            t = `${hour}${minute}00+0300`;
            break;
        default:
            break;
    }

    return {
        Date: d,
        Time: t,
    };
}



/**
 *  To Parse XML lightweight
 * @param {Number} startpos  - Start position for parsing
 * @param {Number} endpos    - Last index for the parser
 * @param {String} innerXml - String inside XML node selected
 * @param {String} [outerXml]  - to be used by itself
 *
 * @returns {[Node] | String}
 */
function Node(startpos, endpos, innerXml, outerXml) {
    this.startpos = startpos;
    this.endpos = endpos;
    this.innerXml = innerXml;
    this.outerXml = outerXml;

    this.getNodes = (name) => {
        const result = [];
        let pos = 0;
        let posFull = 0;
        while (pos !== -1) {
            pos = innerXml.indexOf(`<${name} `, pos);
            if (pos === -1) {
                pos = innerXml.indexOf(`<${name}>`, posFull);
            }
            posFull = pos + 1;
            if (pos > -1) {
                let xml = '';
                let oxml = '';
                let pos2 = innerXml.indexOf(`</${name}>`, pos);
                if (pos2 === -1) {
                    pos2 = innerXml.indexOf('/>', pos);
                    oxml = innerXml.substring(pos, pos2 + 2);
                } else {
                    const p = innerXml.indexOf('>', pos) + 1;
                    xml = innerXml.substring(p, pos2);
                    oxml = innerXml.substring(pos, pos2);
                }
                result.push(new Node(pos, pos2, xml, oxml));

                pos = pos2;
            }
        }
        return result;
    };

    this.getAttr = (name) => {
        const p = outerXml.indexOf(name);
        if (p === -1) {
            return null;
        }
        const p1 = outerXml.indexOf('"', p);
        const p2 = outerXml.indexOf('"', p1 + 1);
        return outerXml.slice(p1 + 1, p2).toString();
    };
}

/**
 * Logging
 * @param {String} name    - Name of the log
 * @param {String} content - Info to be logged
 *
 * @returns {Void}
 */
function Log(name, content) {
    const filename = `/${name}${new Date().toISOString().replace(/:/g, '-')}.xml`;
    fs.writeFileSync(logdir + filename, content);
}

/* eslint-disable */
/**
 * Corrects the airportCodes to allowed ones from airlines
 * @param {Object} sFlight
 *
 * @returns {void}, transforms the sFlight object
 */
function CorrectCode(sFlight) {
    const codes = config.provider.destinationCleaner;
    // We do diffrent loops for from and to becouse foreach loops on the original array!
    sFlight.Flights.forEach((flight, index) => {
        // For direction purposes
        const fromCode = codes[flight.FromType][flight.From];
        if (!fromCode) {
            sFlight.UcusYonler.push([flight.From]);
        }
        if (fromCode) {
            sFlight.UcusYonler.push(fromCode);
            if (typeof fromCode === typeof 'String') {
                flight.From = fromCode;
            } else {

                fromCode.forEach((_fromCode, index) => {
                    if (index === 0) {
                        flight.From = _fromCode;
                        return;
                    }
                    const flightToAdd = new flightModel.flight();
                    flightToAdd.From = _fromCode;
                    flightToAdd.FromType = flight.FromType;
                    flightToAdd.To = flight.To;
                    flightToAdd.ToType = flight.ToType;
                    flightToAdd.Date = flight.Date;
                    sFlight.Flights.push(flightToAdd);
                });
            }
        }
    });

    sFlight.Flights.forEach((flight) => {
        const toCode = codes[flight.ToType][flight.To];
        if (toCode) {
            if (typeof toCode === typeof 'String') {
                flight.To = toCode;
            } else {
                toCode.forEach((_toCode, index) => {
                    if (index === 0) {
                        flight.To = _toCode;
                        return;
                    }
                    const flightToAdd = new flightModel.flight();
                    flightToAdd.From = flight.From;
                    flightToAdd.FromType = flight.FromType;
                    flightToAdd.To = _toCode;
                    flightToAdd.ToType = flight.ToType;
                    flightToAdd.Date = flight.Date;
                    sFlight.Flights.push(flightToAdd);
                });
            }
        }
    });
}

/* eslint-enable */

/**
 * Converts passenger type codes to/from provider type to ky type
 * @param {String}  code             - Code to be converted
 * @param {Boolean} isProviderCode  - True if code is provider code
 *
 * @returns {String} Converted passenger code
 */
function ConvertPassengerCode(code, isProviderCode) {

    let types = config.ky.passengerTypes;
    if (isProviderCode) {
        types = config.provider.passengerTypes;
    }
    const result = types[code];
    if (result) {
        return result;
    }

    return types.def;
}

/**
 * Calculates the flight time
 * @param {String} a - Departure Time
 * @param {String} b - Arrival Time
 *
 * @returns {String} Total flight time in format hhsa mmdak
 */
function FlightTime(a, b) {
    const aa = a.split(':');
    const ab = b.split(':');
    const t1 = parseInt(aa[0], 10) * 60 + parseInt(aa[1], 10);
    let t2 = parseInt(ab[0], 10) * 60 + parseInt(ab[1], 10);
    if (t1 > t2) {
        t2 += 24 * 60;
    }
    const h = Math.floor((t2 - t1) / 60);
    const m = (t2 - t1) % 60;
    let hs = `00${h}`;
    let ms = `00${m}`;
    hs = hs.substring(hs.length - 2);
    ms = ms.substring(ms.length - 2);
    return `${hs}sa ${ms}dk`;
}


/**
 * Creates the Error object which is going to be send out
 * @param {Error} error - Error message
 *
 * @returns {Error} Error Message to send out
 */
function ConvertError(error) {
    const err = new Error();
    if (error.status) {
        const responseCode = errorMap[error.status];
        if (responseCode) {
            switch (responseCode) {
                default: err.message = {
                    Baglantilar: [],
                    Ucuslar: [],
                };
                err.status = 1;
                break;
            }
        } else { // It is not mapped !
            err.message = `Error : ${error.status} : { Baglantilar: [], Ucuslar: [] }`;
            err.status = 1;
        }
    } else { // No Error status
        err.message = `Error : status not set error \n ${error}`;
        err.status = 0;
    }
    return err;
}
module.exports = {
    td: ToDefault,
    reindexArray: ReindexArray,
    compareArrays: CompareArrays,
    getNested: GetNested,
    unify: Unify,
    objectArrayGetDuplicate: ObjectArrayGetDuplicate,
    flightsUnify: FlightsUnify,
    isArrayNullorEmpty: IsArrayNullorEmpty,
    groupBy: GroupBy,
    convertDateTime: ConvertDateTime,
    node: Node,
    log: Log,
    correctCode: CorrectCode,
    convertPassengerCode: ConvertPassengerCode,
    flightTime: FlightTime,
    asyncMapErrorCheck: AsyncMapErrorCheck,
    convertError: ConvertError,
};