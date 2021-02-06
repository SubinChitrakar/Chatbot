'use strict';
const request = require('request');
const config = require('../config');
const pg = require('pg/lib');
pg.defaults.ssl = false;

module.exports = {
    getAllSubCategoryDetails: function(callback) {

        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM sub_category`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let subCategories = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            subCategories.push(result.rows[i]);
                        }
                        callback(subCategories);
                    }
                })
        });
        pool.end();
    },

    getAllSubCategories: function(callback) {

        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM sub_category`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let subCategories = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            subCategories.push(result.rows[i]['name']);
                        }
                        callback(subCategories);
                    }
                })
        });
        pool.end();
    },

    getSubCategory : function (callback, categoryId) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM sub_category WHERE category_id = '${categoryId}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let subCategories = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            subCategories.push(result.rows[i]);
                        }
                        callback(subCategories);
                    }
                })
        });
        pool.end();
    },

    getSubCategoryId : function (callback, subCategoryName) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT id FROM sub_category WHERE "name" = '${subCategoryName}'`,
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

    getSubCategoryName : function (callback, subCategoryId) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT "name" FROM sub_category WHERE id = '${subCategoryId}'`,
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