'use strict';
const request = require('request');
const config = require('../config');
const pg = require('pg/lib');
pg.defaults.ssl = false;

module.exports = {
    getAllCategoryDetails: function(callback) {

        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM category`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let categories = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            categories.push(result.rows[i]);
                        }
                        callback(categories);
                    }
                })
        });
        pool.end();
    },

    getAllCategories: function(callback) {

        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM category`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let categories = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            categories.push(result.rows[i]['name']);
                        }
                        callback(categories);
                    }
                })
        });
        pool.end();
    },

    getCategoryId : function (callback, categoryName) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT id FROM category WHERE "name" = '${categoryName}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        callback(result.rows[0]['id']);
                    }
                })
        });
        pool.end();
    },

    getCategoryName : function (callback, categoryId) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT "name" FROM category WHERE id = '${categoryId}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        callback(result.rows[0]['name']);
                    }
                })
        });
        pool.end();
    }
};