var config = require('./config.js')
	, couchbase = require('couchbase')
	, Promise = require('promise');
var _ = require('lodash');

// no. of stale responses until we force refresh
var MAX_STALE_RESPONSES = 10;


module.exports = function(){

  var cluster = new couchbase.Cluster(config.Cluster);
  var _stale_cnt = 0;
  var buildJobs = {}
  config.Buckets.forEach(function(b){
  	buildJobs[b] = {}
  })

  function _query(bucket, queryStr){
	  console.log(queryStr)
	  bucket = bucket || config.DefaultBucket
	  var db = cluster.openBucket(config.DefaultBucket)
	  var q = couchbase.N1qlQuery.fromString(queryStr)
	  var promise = new Promise(function(resolve, reject){
		  db.query(q, function(err, components) {
		  		if(!err){
			  		resolve(components)
			  	} else {
			  		reject(err)
			  	}
		  })
	  })
	  return promise
  }

  var API =  {  

    openBucket: function(bucket){
      bucket = bucket || config.DefaultBucket
	  return cluster.openBucket(config.DefaultBucket)
    },
    queryVersions: function(bucket){
        var Q = "SELECT DISTINCT SPLIT(`build`,'-')[0] AS version"+
                " FROM "+bucket+" ORDER BY version"
        return _query(bucket, Q)
    },
    queryBuilds: function(bucket, version){
        var Q = "SELECT `build`,SUM(failCount) AS Failed,SUM(totalCount)-SUM(failCount) AS Passed"+
                " FROM "+bucket+" WHERE `build` like '"+version+"%' GROUP BY `build`";
        return _query(bucket, Q)
    },
    jobsForBuild: function(bucket, build){
      var ver = build.split('-')[0]
      var Q = "SELECT * FROM "+bucket+" WHERE `build` LIKE '"+ver+"%'"
      var qp = _query(bucket, Q)

      return qp.then(function(data){

        // jobs for this build
        data = _.pluck(data, bucket)
        var jobs = _.filter(data, 'build', build)
        var jobNames = _.pluck(jobs, 'name')

        var pending = _.filter(data, function(j){
          // job is pending if name is not in known job names
          return _.indexOf(jobNames, j.name) == -1
        })

        // convert total to pending for non-executed jobs
        pending = _.map(_.uniq(pending, 'url'), function(job){
          job["pending"] = job.totalCount
          job["totalCount"] = 0
          job["failCount"] = 0
          job["result"] = "Pending"
          return job
        })
        return jobs.concat(pending)
      })
    },
    queryBucket: _query

  }

  return API

}()



// number of jobs per os
// SELECT os,component, COUNT(*) as count from server GROUP BY os;