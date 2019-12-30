import * as Index from "../main/index";
import * as assert from "assert";
import * as _ from "lodash";
import {Sequelize, DataType} from 'sequelize-typescript';

describe("index", () => {

  [
    process.env.DATABASE_URL_PG,
    process.env.DATABASE_URL_MYSQL
  ]
    .forEach((DATABASE_URL) => {
      describe(`DIALECT[${DATABASE_URL}]`, () => {
        let sequelize: any;
        let queryInterface: any;
        beforeEach(function () {
          sequelize = new Sequelize(DATABASE_URL, {
            logging: false,
            pool: {
              max: 3
            }
          });
          const TestTable = sequelize.define('TestTable', {
            id: {
              type: DataType.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false
            },
            testInteger: DataType.INTEGER,
            testString: DataType.STRING,
            testDateOnly: DataType.DATEONLY,
            testDate: DataType.DATE,
            testBigint: DataType.BIGINT,
            // testForeignKey: DataType.INTEGER,
            unknownForeignKey: DataType.INTEGER,
            testIndexString: DataType.STRING,
            testCombinedIndexString: DataType.STRING,
            testUniqueIndexString: DataType.STRING,
            testUniqueString: {
              unique: true,
              type: DataType.STRING,
            },
            testNonIndexString: DataType.STRING,
          }, {
            tableName: 'TestTable',
            indexes: [
              {
                fields: ['testIndexString']
              },
              {
                fields: ['testIndexString', 'testCombinedIndexString']
              },
              {
                fields: ['testUniqueIndexString', 'testCombinedIndexString'],
                unique: true
              },
              {
                fields: ['testUniqueIndexString'],
                unique: true
              }
            ],
          });

          const ForeignTable = sequelize.define('ForeignTable', {
            id: {
              type: DataType.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false
            },
            stringForeignKey: {
              type: DataType.STRING,
              unique: true
            },
          }, {
            tableName: 'ForeignTable',
          });

          const AutoCreateFieldTable = sequelize.define('AutoCreateFieldTable',
            {}, {
              timestamps: true,
              tableName: 'AutoCreateFieldTable'
            });

          TestTable.belongsTo(ForeignTable, {as: 'testForeignKey'});
          queryInterface = sequelize.getQueryInterface();

          return queryInterface
            .dropAllTables()
            .then(() => {
              return sequelize.sync({force: true})
            })
            .then(() => {
              return queryInterface
                .createTable('SequelizeMeta', {
                  meta: {
                    type: DataType.STRING,
                    allowNull: false
                  }
                });
            })
            .then(() => {
              return Index.validateSchemas(sequelize);
            });
        });

        describe('option.exclude', () => {

          it('skip tables', function () {
            return queryInterface
              .createTable('UnknownTable', {
                meta: {
                  type: DataType.STRING,
                  allowNull: false
                }
              })
              .then(() => {
                return Index.validateSchemas(sequelize, {
                  exclude: ['SequelizeMeta', 'UnknownTable']
                });
              });
          });

          it('can check unknown table', function () {
            return Index.validateSchemas(sequelize, {
              exclude: []
            })
              .then(() => {
                assert(false);
              })
              .catch(error => {
                assert(_.includes(error.message, 'SequelizeMeta has not been defined'));
              });
          });
        });

        describe('checkAttributes', () => {

          it('field modified by migration only', function () {
            return queryInterface
              .changeColumn('TestTable', 'testString', {type: DataType.STRING(100)})
              .then(() => {
                return Index.validateSchemas(sequelize);
              })
              .then(() => {
                assert(false);
              })
              .catch(error => {
                assert(_.includes(error.message, 'field type is invalid'));
              });
          });

          it('field created by migration only', function () {
            return queryInterface
              .addColumn('TestTable', 'unknownField', {type: DataType.STRING})
              .then(() => {
                return Index.validateSchemas(sequelize);
              })
              .then(() => {
                assert(false);
              })
              .catch(error => {
                assert(_.includes(error.message, 'unknownField is not defined'));
              });
          });

        });

        describe('checkForeignKey', () => {
          it('foreignKey created by migration only', function () {
            return queryInterface
              .addConstraint('TestTable', ['unknownForeignKey'], {
                type: 'FOREIGN KEY',
                references: {
                  table: 'ForeignTable',
                  field: 'id'
                }
              })
              .then(() => {
                return Index.validateSchemas(sequelize);
              })
              .then(() => {
                assert(false);
              })
              .catch(error => {
                if(sequelize.options.dialect === 'mysql') {
                  assert(_.includes(error.message, '[unknownForeignKey] is not defined index'));
                } else {
                  assert(_.includes(error.message, '[unknownForeignKey] must be defined foreign key'));
                }
              });

          });
        });

        describe('checkIndexes', () => {
          it('index created by migration only', function () {
            return queryInterface
              .addIndex('TestTable', {fields: ['testNonIndexString']})
              .then(() => {
                return Index.validateSchemas(sequelize);
              })
              .then(() => {
                assert(false);
              })
              .catch(error => {
                assert(_.includes(error.message, '[testNonIndexString] is not defined index'));
              });

          });

        });

      });
    });
});