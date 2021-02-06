'use strict';
const request = require('request');
const config = require('../config');
const pg = require('pg/lib');
pg.defaults.ssl = false;

module.exports = {
    getAllSupervisors: function (callback) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM supervisors`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let supervisors = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            supervisors.push(result.rows[i]['name']);
                        }
                        callback(supervisors);
                    }
                })
        });
        pool.end();
    },

    getSupervisorDetails:function(callback, supervisorName){
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM supervisors WHERE "name" = '${supervisorName}'`,
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

    getAllSupervisorByAreaOfExpertise: function (callback, areaOfExpertise) {
        var pool = new pg.Pool(config.PG_CONFIG);
        pool.connect(function (err, client, done) {
            if (err) {
                return console.error('Error acquiring client', err.stack);
            }
            client.query(`SELECT * FROM supervisors WHERE area_of_expertise = '${areaOfExpertise}'`,
                function (err, result) {
                    if (err) {
                        console.log('Query error: ' + err);
                        callback([]);
                    } else {
                        let supervisors = [];
                        for (let i = 0; i < result.rows.length; i++) {
                            supervisors.push(result.rows[i]['name']);
                        }
                        callback(supervisors);
                    }
                })
        });
        pool.end();
    }
};