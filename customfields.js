const Api = require('./api');
const config = require('./config')['sandbox'];

const api = new Api(config.host, config.accessToken);


function setUpProductFields() {
    return api.get('processes')
        .then(processes => {
            const processIds = processes
                .filter(p => !config.excludedProcesses.includes(p['Name']))
                .map(p => p['Id']);
            return generateCustomFields(config.customFieldNames, processIds, config.entityTypeIds);
        })
        .then(possibleCustomFields => filterExistingCustomFields(config.customFieldNames, possibleCustomFields))
        .then(customFields => {
            customFields.sort(f => f['Name']);

            return customFields
                //.filter(customField => customField['Process']['Id'] === 15)
                //.slice(0, 5)
                //.forEach(customField => api.post('customfields', customField)) //DANGER!
                .reduce((promise, customField) => promise.then(res => api.post('customfields', customField)), Promise.resolve());
        });
}


function generateCustomFields(customFieldNames, processIds, entityTypeIds) {
    const customFields = [];

    const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
    const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

    cartesian(customFieldNames, processIds, entityTypeIds)
        .forEach(([customFieldName, processId, entityTypeId]) => customFields.push({
            Name: customFieldName,
            FieldType: 'Text',
            Required: false,
            IsSystem: true,
            EntityType: {
                Id: entityTypeId
            },
            Process: {
                Id: processId
            }
        }));

    return customFields;
}


function filterExistingCustomFields(customFieldNames, possibleCustomFields) {
    const fieldsFilter = `('${customFieldNames.join(`','`)}')`;
    return api.get('customfields', `Name in ${fieldsFilter}`)
        .then(existingCustomFields => {
            const checkIfEqual = (a, b) => a['Name'] === b['Name']
                && a['Process']['Id'] === b['Process']['Id']
                && a['EntityType']['Id'] === b['EntityType']['Id'];

            return possibleCustomFields.filter(p => existingCustomFields.filter(e => checkIfEqual(e, p)).length === 0)
        });
}

setUpProductFields();
