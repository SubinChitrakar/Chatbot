'use strict';
const request = require('request');
const config = require('../config');
const pg = require('pg/lib');
pg.defaults.ssl = false;

module.exports = {
    getResearchFromCategory: function (callback, categoryId) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM research WHERE category_id = '${categoryId}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        callback(result.rows[0]);
                    }
                })
        });
        pool.end();
    },

    getResearchFromSubCategory: function (callback, subCategoryId) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM research WHERE sub_category_id = '${subCategoryId}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        callback(result.rows[0]);
                    }
                })
        });
        pool.end();
    }
};