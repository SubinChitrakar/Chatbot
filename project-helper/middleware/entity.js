module.exports = {
    createEntity: async function (callback, entityTypesClient, projectId, result, displayName) {
        const agentPath = entityTypesClient.projectAgentPath(projectId);

        result = createEntitiesJSON(result);
        const createEntityTypeRequest = {
            parent: agentPath,
            entityType: {
                displayName: displayName,
                kind: 'KIND_MAP',
                autoExpansionMode: 'AUTO_EXPANSION_MODE_DEFAULT',
                entities: result,
                enableFuzzyExtraction: true
            },
        };

        const responses = await entityTypesClient.createEntityType(createEntityTypeRequest);

        console.log(`Created ${responses[0].name} entity type`);
        callback(createEntityTypeRequest, projectId, result, displayName);
    },

    updateEntity: async function (callback, entityTypesClient, projectId, result, entityJSON) {
        entityJSON.entities = {};
        entityJSON.entities = createEntitiesJSON(result);
        entityJSON.entityName = entityJSON.name;
        const updateEntityTypeRequest = {
            entityType: entityJSON
        };

        const responses = await entityTypesClient.updateEntityType(updateEntityTypeRequest);
        callback(responses[0], entityTypesClient, projectId, result, entityJSON)
    },

    getAllEntities: async function(callback, entityTypesClient, projectId){
        const agentPath = entityTypesClient.projectAgentPath(projectId);

        const getEntityRequest = {
            parent: agentPath
        };

        const responses = await entityTypesClient.listEntityTypes(getEntityRequest);
        callback(responses[0], entityTypesClient, projectId);
    }
};

function createEntitiesJSON(result) {
    let resultJSON = [];

    result.forEach(element => {
        resultJSON.push({
            value: element,
            synonyms: [element]
        });
    });
    return resultJSON
}
