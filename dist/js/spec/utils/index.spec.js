"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Index = require("../../main/index");
const assert = require("assert");
const _ = require("lodash");
const sequelize_typescript_1 = require("sequelize-typescript");
describe("index", () => {
    describe('validateSchemas', () => {
        let sequelize;
        beforeEach(function () {
            const TestTable = sequelize.define('TestTable', {
                id: {
                    type: sequelize_typescript_1.Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                testInteger: sequelize_typescript_1.Sequelize.INTEGER,
                testString: sequelize_typescript_1.Sequelize.STRING,
                testDateOnly: sequelize_typescript_1.Sequelize.DATEONLY,
                testDate: sequelize_typescript_1.Sequelize.DATE,
                testBigint: sequelize_typescript_1.Sequelize.BIGINT,
                testIndexString: sequelize_typescript_1.Sequelize.STRING,
                testCombinedIndexString: sequelize_typescript_1.Sequelize.STRING,
                testUniqueIndexString: sequelize_typescript_1.Sequelize.STRING,
                testUniqueString: {
                    unique: true,
                    type: sequelize_typescript_1.Sequelize.STRING,
                },
                testNonIndexString: sequelize_typescript_1.Sequelize.STRING
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
                    type: sequelize_typescript_1.Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                testString: sequelize_typescript_1.Sequelize.STRING,
            }, {
                tableName: 'ForeignTable',
            });
            TestTable.belongsTo(ForeignTable, { as: 'testForeignKey' });
            return sequelize
                .sync({ force: true })
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
                return sequelize
                    .validateSchemas({
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
                return sequelize.queryInterface
                    .changeColumn('TestTable', 'testString', { type: sequelize_typescript_1.Sequelize.STRING(100) })
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
                    .addColumn('TestTable', 'unknownField', { type: sequelize_typescript_1.Sequelize.STRING })
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
                    assert(_.includes(error.message, '"unknownForeignKey" referenced in foreign key constraint does not exist'));
                });
            });
        });
        describe('checkIndexes', () => {
            it('index created by migration only', function () {
                return sequelize
                    .getQueryInterface()
                    .addIndex('TestTable', { fields: ['testNonIndexString'] })
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
//# sourceMappingURL=index.spec.js.map