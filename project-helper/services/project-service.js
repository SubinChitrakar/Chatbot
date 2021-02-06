'use strict';
const request = require('request');
const config = require('../config');
const pg = require('pg/lib');
pg.defaults.ssl = false;

module.exports = {

    getAllProjects : function(callback){
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let projects = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            projects.push(result.rows[i]['project_name']);
                        }
                        callback(projects);
                    }
                })
        });
        pool.end();
    },

    getProjectFromCategories : function (callback, category1, category2){
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects WHERE category_1 = '${category1}' AND category_2 ='${category2}' OR category_1 = '${category2}' AND category_2 ='${category1}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let projects = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            projects.push(result.rows[i]['project_name']);
                        }
                        callback(projects);
                    }
                })
        });
        pool.end();
    },

    getProjectFromSubCategories : function (callback, category1, category2){
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects WHERE sub_category_1 = '${category1}' AND sub_category_2 ='${category2}' OR sub_category_1 = '${category2}' AND sub_category_2 ='${category1}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let projects = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            projects.push(result.rows[i]['project_name']);
                        }
                        callback(projects);
                    }
                })
        });
        pool.end();
    },

    getProjectFromSkill : function (callback, skill1, projectArea){
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects WHERE sub_category_1 = '${projectArea}' AND sub_category_2 IS NULL AND  skill_1 = '${skill1}' OR skill_2 ='${skill1}' OR skill_3 = '${skill1}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let projects = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            projects.push(result.rows[i]['project_name']);
                        }
                        callback(projects);
                    }
                })
        });
        pool.end();
    },

    getProjectFromCategory : function (callback, category){
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects WHERE category_1 = '${category}' OR category_2 ='${category}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let projects = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            projects.push(result.rows[i]);
                        }
                        callback(projects);
                    }
                })
        });
        pool.end();
    },

    getProjectFromOneCategory : function (callback, category){
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects WHERE category_1 = '${category}' AND category_2 IS NULL`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let projects = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            projects.push(result.rows[i]);
                        }
                        callback(projects);
                    }
                })
        });
        pool.end();
    },

    getProjectFromOneSubCategory : function (callback, subCategory){
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects WHERE sub_category_1 = '${subCategory}' AND sub_category_2 IS NULL`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let projects = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            projects.push(result.rows[i]);
                        }
                        callback(projects);
                    }
                })
        });
        pool.end();
    },

    getProjectsFromSubCategory: function (callback, subCategory) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects WHERE sub_category_1 = '${subCategory}' OR sub_category_2 ='${subCategory}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let projects = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            projects.push(result.rows[i]);
                        }
                        callback(projects);
                    }
                })
        });
        pool.end();
    },

    getProjectFromName: function (callback, projectName) {
        projectName = projectName.toUpperCase();
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM projects WHERE UPPER(project_name) = '${projectName}'`,
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