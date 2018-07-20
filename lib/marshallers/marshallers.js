const ENTITY_TYPE_KEY = 'entity-type';

const NUXEO_ENTITY_MAPPING = {
  document: (obj) => obj.uid,
  directoryEntry: (obj) => obj.id || obj.properties.id,
  user: (obj) => obj.id,
  group: (obj) => obj.id || obj.groupname,
};

const isNuxeoObject = (obj) => {
  if (typeof obj === 'object' && obj[ENTITY_TYPE_KEY]) {
    return !!NUXEO_ENTITY_MAPPING[obj[ENTITY_TYPE_KEY]];
  }
  return false;
};

const processNuxeoObject = (obj) => {
  const mapping = NUXEO_ENTITY_MAPPING[obj[ENTITY_TYPE_KEY]];
  return mapping ? mapping(obj) : obj;
};

const processObject = (obj) => {
  function processValue(value) {
    if (value instanceof Array) {
      return value.map((o) => processValue(o));
    } else if (typeof value === 'object') {
      return processObject(value);
    }
    return value;
  }

  if (!obj) {
    return obj;
  }

  if (isNuxeoObject(obj)) {
    return processNuxeoObject(obj);
  }

  return Object.entries(obj)
    .map(([key, value]) => ({ [key]: processValue(value) }))
    .reduce((acc, o) => Object.assign(acc, o), {});
};

// default marshallers

const DOCUMENT_OPTIONAL_FIELDS = ['name', 'type', 'changeToken'];

const documentMarshaller = (obj) => {
  const {
    [ENTITY_TYPE_KEY]: entityType,
    uid,
    properties,
  } = obj;

  const doc = {
    [ENTITY_TYPE_KEY]: entityType,
    uid,
    properties: processObject(properties),
  };

  DOCUMENT_OPTIONAL_FIELDS.map((field) => (obj[field] ? { [field]: obj[field] } : {}))
    .reduce((acc, o) => Object.assign(acc, o), doc);
  return doc;
};

const directoryEntryMarshaller = (obj) => {
  const {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    directoryName,
    properties,
  } = obj;

  return {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    directoryName,
    properties: processObject(properties),
  };
};

const userMarshaller = (obj) => {
  const {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    properties,
  } = obj;

  return {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    properties: processObject(properties),
  };
};
const groupMarshaller = (obj) => {
  const {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    groupname,
    grouplabel,
    memberUsers,
    memberGroups,
    properties,
  } = obj;

  return {
    [ENTITY_TYPE_KEY]: entityType,
    id,
    groupname,
    grouplabel,
    memberUsers,
    memberGroups,
    properties,
  };
};

const marshallers = {};

const Marshallers = {
  registerMarshaller: (entityType, marshaller) => {
    marshallers[entityType] = marshaller;
  },

  marshall: (obj) => {
    const entityType = obj[ENTITY_TYPE_KEY];
    const marshaller = marshallers[entityType];
    return (marshaller && marshaller(obj)) || obj;
  },

  documentMarshaller,
  directoryEntryMarshaller,
  userMarshaller,
  groupMarshaller,
};

module.exports = Marshallers;
