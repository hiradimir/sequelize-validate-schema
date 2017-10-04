import * as Sequelize from "sequelize";
import * as assert from "assert";
import * as Promise from "bluebird";
import * as _ from "lodash";


interface IModelAttribute {
  type: any
  primaryKey: boolean
  autoIncrement: boolean
  field: string
  allowNull: boolean
  unique: boolean
  name: string
  onDelete: string
  onUpdate: string
  references?: { model: string, key: string }
}

interface IRawModel {
  attributes: { [index: string]: IModelAttribute }
  primaryKeys: { [index: string]: IModelAttribute }
  options: any;
}

interface IDescribedAttribute {
  type: string
  allowNull: boolean
  defaultValue: any
  primaryKey: boolean
}

/**
 * Validate schema of models.
 *
 * @param {Object} [options={}]
 * @param {String[]|function} [options.exclude=[`sequelizeMeta`]] if you want to skip validate table.
 * @param {Boolean|function} [options.logging=console.log] A function that logs sql queries, or false for no logging
 * @return {Promise}
 */
export const validateSchemas = (sequelize: any, options?) => {

  options = _.clone(options) || {};
  options = _.defaults(options, {exclude: ['SequelizeMeta']}, sequelize.options);

  const queryInterface = sequelize.getQueryInterface();

  // FIXME: necessary to support any dialect
  const dataTypeToDBType = (attr: IModelAttribute) => {

    // this support only postgres
    if (attr.type instanceof Sequelize.STRING) {
      return `CHARACTER VARYING(${attr.type._length})`;
    } else if (attr.type instanceof Sequelize.INTEGER) {
      return 'INTEGER';
    } else if (attr.type instanceof Sequelize.DATE) {
      return 'TIMESTAMP WITH TIME ZONE';
    } else if (attr.type instanceof <any>Sequelize.DATEONLY) {
      return 'DATE';
    } else if (attr.type instanceof Sequelize.BIGINT) {
      return 'BIGINT';
    } else {
      console.error(`${attr.field}\n${JSON.stringify(attr.type)}`);
    }
  };

  const checkAttributes = (queryInterface, tableName, model, options) => {
    return queryInterface.describeTable(tableName, options)
      .then(attributes => {
        return Promise.each(Object.keys(attributes), fieldName => {
          const attribute = attributes[fieldName];
          const modelAttr = model.attributes[fieldName];
          assert(!_.isUndefined(modelAttr), `${tableName}.${fieldName} is not defined.\n${modelAttr}.\n${JSON.stringify(model.attributes, null, 2)}`);
          const dataType = dataTypeToDBType(modelAttr);
          assert(dataType === attribute.type, `${tableName}.${fieldName} field type is invalid.  Model.${fieldName}.type[${dataType}] != Table.${fieldName}.type[${attribute.type}]`);
          assert(modelAttr.field === fieldName, `fieldName is not same. Model.field[${modelAttr.field}] != Table.primaryKey[${attribute.primaryKey}]`);
          assert(modelAttr.primaryKey === true === attribute.primaryKey === true, `illegal primaryKey defined ${tableName}.${fieldName}. Model.primaryKey[${modelAttr.primaryKey}] != Table.primaryKey[${fieldName}]`);
          assert((modelAttr.allowNull === true || _.isUndefined(modelAttr.allowNull)) === attribute.allowNull === true, `illegal allowNull defined ${tableName}.${fieldName}. Model.allowNull[${modelAttr.allowNull}] != Table.allowNull[${attribute.allowNull}]`);

        });
      });
  };

  const checkForeignKey = (queryInterface, tableName, model, options) => {
    return sequelize.query(queryInterface.QueryGenerator.getForeignKeysQuery(tableName), options)
      .then((foreignKeys: Array<any>) => {

        return Promise.each(foreignKeys, (modelAttr:IModelAttribute) => {
          if (modelAttr.references) {
            const fk = _.find(foreignKeys, fk => {
              return fk.from === queryInterface.QueryGenerator.quoteIdentifier(modelAttr.field);
            });
            assert(!_.isUndefined(fk), `${tableName}.${modelAttr.field} defined foreign key.\n${JSON.stringify(foreignKeys, null, 2)}`);
            assert(fk.to === modelAttr.references.key, `${tableName}.${modelAttr.field} => ${modelAttr.references.key} must be same to foreignKey [${fk.to}].\n${JSON.stringify(fk, null, 2)}`);
          }
        });
      });
  };

  const checkIndexes = (queryInterface, tableName, model: IRawModel, options) => {
    return queryInterface
      .showIndex(tableName, options)
      .then((indexes: Array<any>) => {
        return Promise.each(indexes, index => {
          if (index.primary) {
            index.fields.forEach(field => {
              assert(!_.isUndefined(model.primaryKeys[field.attribute]), `${tableName}.${field.attribute} must be primaryKey`);
            });
          } else {
            const indexFields = _.map(index.fields, (field: any) => {
              return field.attribute;
            });

            const modelIndex = _.find(model.options.indexes, (modelIndex: any) => {
              return _.isEqual(modelIndex.fields, indexFields);
            });

            if (indexFields.length > 1) {
              assert(!_.isUndefined(modelIndex), `${tableName}.[${indexFields}] must be defined combination key\n${JSON.stringify(index, null, 2)}`);
            }
            if (modelIndex) {
              assert(modelIndex.unique === true === index.unique === true, `${tableName}.[${indexFields}] must be same unique value\n${JSON.stringify(index, null, 2)}`);
            } else if (model.attributes[indexFields[0]].unique) {
              assert(index.unique === true, `${tableName}.[${indexFields}] must be defined unique key\n${JSON.stringify(index, null, 2)}`);
            } else {
              assert(false, `${tableName}.[${indexFields}] is not defined index\n${JSON.stringify(index, null, 2)}`);
            }
          }
        });
      });
  };

  return Promise.try(() => {
    return queryInterface
      .showAllTables(options)
      .then(tableNames => {
        return Promise
          .all(
            tableNames
              .filter(tableName => {
                // TODO: treat exclude as a function
                return !_.includes(options.exclude, tableName);
              })
              .map(tableName => {
                return sequelize.model(tableName);
              })
              .map(model => {
                return checkAttributes(queryInterface, model.options.tableName, model, options)
                  .then(() => {
                    return checkForeignKey(queryInterface, model.options.tableName, model, options);
                  })
                  .then(() => {
                    return checkIndexes(queryInterface, model.options.tableName, model, options);
                  });
              })
          );
      });

  });
}