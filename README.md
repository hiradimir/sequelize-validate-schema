# sequelize-validate-schema

[![npm version](https://badge.fury.io/js/sequelize-validation-schema.svg)](https://badge.fury.io/js/sequelize-validation-schema)
[![CircleCI](https://circleci.com/gh/hiradimir/sequelize-validate-schema.svg?style=svg)](https://circleci.com/gh/hiradimir/sequelize-validate-schema)
[![codecov](https://codecov.io/gh/hiradimir/sequelize-validate-schema/branch/master/graph/badge.svg)](https://codecov.io/gh/hiradimir/sequelize-validate-schema)


sequelize-validate-schema is plugin of [sequelize](https://github.com/sequelize/sequelize);

# Purpose

This plugin is simple feature.
Function `validateSchemas` will check defined sequelize models and db-schema.
If check is ng, promise returned by validateSchemas will be rejected.


## Use Case

If you are worried that dirty migration.
For example migration-scripts are correct sql, but migrated db is may not same model-schema.
ex) model string field length is 255, but schema string field length 64.


## Installation

```bash
npm install -save sequelize-validation-schema
```


## Usage


```js
var validateSchemas = require("sequelize-validation-schema").validateSchemas;


// initialize Sequelize
var sequelize = new Sequelize(process.env.DATABASE_URL);


sequelize.sync({force: process.env.NODE_ENV !== 'production'})
    .then(()=>{
      // validateSchemas is Promise based function
      return validateSchemas(sequelize, {logging: false})
        .then(function(){
          console.log("your schema is clean");
        })
        .error(function(error){
          console.log("your schema is wrong between model and db.", error);
        });
    })

```


## TODO for Release v1

- [ ] support dialect MySQL
- [ ] support dialect SQLite
- [ ] support DataTypes
- [ ] check defined at model, but not exists in db-schema
- [ ] refactoring


