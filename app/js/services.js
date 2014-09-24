var serviceApp = angular.module('greenboardServices', []);

serviceApp.service("ViewService",['$http',
  function($http) {

    var mapReduceByCategoryPlatform = function(data, platforms, categories){

          // filter out matching platforms
          if (platforms && platforms.length > 0){
             data = data.filter(function(result){
              if(platforms.indexOf(result.Platform) > -1) { // exists
                return false; // exclude match
              }
              return true;
            });
          }

          // filter out matching categories
          if (categories && categories.length > 0){

             data = data.filter(function(result){
              if(categories.indexOf(result.Category) > -1) { // exists
                return false; // exclude match
              }
              return true;
            });

          }

          return data;

    }

    return {
      versions: function() {
        return $http.get("/versions").then(function(response) {
              var data = response.data;
              return Object.keys(data);
        });
      },
      timeline: function(version, filterBy, endVersion) {

        var config = {"url": "/timeline",
                      params: {"start_key": version},
                      cache: true };

        if (endVersion) {
            config["params"]["end_key"] = endVersion;
        }

        return $http(config).then(function(response) {

          var data = response.data;
          var allBuilds, versions, versionBuilds, absData, relData;
          var low, high;

		      absData = [{
              "key": "Passed",
              "values": []
            }, {
              "key": "Failed",
              "values": []
          }];
          relData = [{
            "key": "Passed, %",
            "values": []
          }, {
            "key": "Failed, %",
            "values": []
          }];

          allBuilds = data.map(function(build) {
            return build.Version;
          });


          var appendBuild = function(build){
              absData[0].values.push([build.Version, build.AbsPassed]);
              absData[1].values.push([build.Version, -build.AbsFailed]);
              relData[0].values.push([build.Version, build.RelPassed]);
              relData[1].values.push([build.Version, build.RelFailed]);
          }

          // filter builds for selected version
          versionBuilds = data.filter(function(build) {
            if (build.Version.indexOf(version) > -1){
              if(filterBy.key == "abspassed"){
                if (build.AbsPassed > filterBy.value) {
                  appendBuild(build);
                  return true;
                }
              }

              if(filterBy.key == "absfailed"){
                if (build.AbsFailed > filterBy.value) {
                  appendBuild(build);
                  return true;
                }
              }

              if(filterBy.key == "percpassed"){
                if (build.RelPassed > filterBy.value) {
                  appendBuild(build);
                  return true;
                }
              }

              if(filterBy.key == "percfailed"){
                if (build.RelFailed > filterBy.value) {
                  appendBuild(build);
                  return true;
                }
              }

            }
          });

          return {"allBuilds": allBuilds,
                  "versionBuilds": versionBuilds,
                  "absData": absData,
                  "relData" : relData};
        });
      },
      breakdown: function(build, platforms, categories){

        var config = {"url": "/breakdown",
                      "params": {"build": build},
                      cache: true};
        return $http(config).then(function(response) {

          return mapReduceByCategoryPlatform(response.data, platforms, categories);
        });

      },
      jobs: function(build, platforms, categories){

        var config = {"url": "/jobs",
                      "params": {"build": build},
                      cache: true};
        return $http(config).then(function(response) {

          return mapReduceByCategoryPlatform(response.data, platforms, categories);
        });
      }
    };
}]);