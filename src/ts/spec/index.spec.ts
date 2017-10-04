import * as Index from "../main/index";
import * as assert from "assert";
import * as _ from "lodash";
import * as Sequelize from "sequelize";

describe("index", () => {

  describe('validateSchemas', () => {
    let sequelize: any;
    beforeEach(function () {
      sequelize = new Sequelize(process.env.DATABASE_URL, {logging: false});
      const TestTable = sequelize.define('TestTable', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        testInteger: Sequelize.INTEGER,
        testString: Sequelize.STRING,
        testDateOnly: Sequelize.DATEONLY,
        testDate: Sequelize.DATE,
        testBigint: Sequelize.BIGINT,
        // testForeignKey: Sequelize.INTEGER,
        unknownForeignKey: Sequelize.INTEGER,
        testIndexString: Sequelize.STRING,
        testCombinedIndexString: Sequelize.STRING,
        testUniqueIndexString: Sequelize.STRING,
        testUniqueString: {
          unique: true,
          type: Sequelize.STRING,
        },
        testNonIndexString: Sequelize.STRING,
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
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        stringForeignKey: {
          type: Sequelize.STRING,
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

      return sequelize
        .sync({force: true})
        .then(() => {
          return sequelize.query('DROP TABLE IF EXISTS public."SequelizeMeta";');
        })
        .then(() => {
          return sequelize.query('DROP TABLE IF EXISTS public."UnknownTable";');
        })
        .then(() => {
          return sequelize.query('CREATE TABLE public."SequelizeMeta" (meta VARCHAR(255) NOT NULL);');
        })
        .then(() => {
          return Index.validateSchemas(sequelize);
        });
    });

    describe('option.exclude', () => {

      it('skip tables', function () {
        return sequelize.query('CREATE TABLE public."UnknownTable" (meta VARCHAR(255) NOT NULL);')
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
        return sequelize
          .getQueryInterface()
          .changeColumn('TestTable', 'testString', {type: Sequelize.STRING(100)})
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
        return sequelize
          .getQueryInterface()
          .addColumn('TestTable', 'unknownField', {type: Sequelize.STRING})
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
        return sequelize
          .getQueryInterface()
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
            assert(_.includes(error.message, '[unknownForeignKey] must be defined foreign key'));
          });

      });
    });

    describe('checkIndexes', () => {
      it('index created by migration only', function () {
        return sequelize
          .getQueryInterface()
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