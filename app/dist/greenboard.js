'usev strict'
/*
var app = angular.module('greenBoard', [
  'ui.router',
  'svc.data',
  'svc.view',
  'svc.query',
  'ctl.main',
  'ctl.timeline',
  'ctl.initdata',
  'ctl.sidebar',
  'ctl.jobs'
]);*/
var app = angular.module('greenBoard', [
  'ui.router',
  'svc.data',
  'svc.query',
  'ctrl.main',
  'app.target',
  'app.timeline'
]);


app.config(['$stateProvider', '$urlRouterProvider',
  function($stateProvider, $urlRouterProvider){
    $urlRouterProvider.otherwise("/server/latest");

    $stateProvider
      .state('main', {
        url: "/:target/:version",
        templateUrl: "view.html",
        controller: "MainCtrl"
      })

      /*.state('target.version', {  
        // 
        // if version is latest get Highest Version no.
        // get all builds for selected version
        // make timeline of builds based on version
        url: "/:version",
        views: {
          "timeline": {
            templateUrl: "partials/timeline.html",
            controller: "TimelineCtrl",
          }
        }

      })*/

      /*
      ,
        resolve: {
          selectedVersion: ['$stateParams', 'ViewTargets', function($stateParams, ViewTargets){
            var version = $stateParams.version
            if(version == 'latest'){
              version = versions[versions.length-1]
            }
            return version
          }]
        }


      .state('target.version.build', {  
        // if build is latest get Highest build no
        // jobs for build based on version
        url: "/:build_id",
        templateUrl: "partials/jobs.html",
        controller: "JobsCtrl",
        resolve:{
          jobs: ['versions', function(versions){
            console.log("jobs breakdown", versions)
            return true
          }]
        }
      })*/

  }]);


// build state is templateless with child siblings (jobs/sidebar)
// they each take in target/version/build service to setup data for their views


// main controller manages Data Services.  Directives receive data from main ctonroller


angular.module('svc.data', [])
    .provider('Data', [function (){

        this.versions = [];
        this.target = "server";
        this.version = null;
        this.versions = [];  

        this.$get = function(){
            return {
                setTarget: function(target){
                    this.target = target
                },
                setTargetVersions: function(versions){
                    this.versions = versions
                },
                setSelectedVersion: function(version){
                    this.version = version
                },
                getCurrentTarget: function(){
                    return this.target
                },
                getTargetVersions: function(){
                    return this.versions
                },
                getSelectedVersion: function(){
                    return this.version
                }

            }
        }
}])



angular.module('ctrl.main', [])
	.controller("MainCtrl", ['$scope', '$stateParams', 'Data', 'QueryService',
		function($scope, $stateParams, Data, QueryService){

		function loadTargetVersions(target){
			$scope.target = target
			Data.setTarget($scope.target)

			// get versions for Target
			QueryService.getVersions($scope.target)
				.then(function(versions){
		            // set selected version of all versions for target
					var version = $stateParams.version
		            if(version == 'latest'){
		              $scope.version = versions[versions.length-1]
		            } else {
		              $scope.version = version
		            }

					// update version info in shared data service
		            Data.setTargetVersions(versions)
		            Data.setSelectedVersion($scope.version)
		        })
		}

		// update target versions when drop down target changes
		$scope.changeTarget = function(target){
			loadTargetVersions(target)
		}

		// change version and update builds for version
		$scope.changeVersion = function(version){
			$scope.version = version
			Data.setSelectedVersion($scope.version)
		}

		// initialize ui with url target param
		loadTargetVersions($stateParams.target)
	}])

angular.module('app.timeline', ['plotly'])

  .controller('TimelineCtrl', ['$scope', 'QueryService', 'ViewTargets', 'selectedVersion', 
  	                          'PASS_BAR_STYLE', 'FAIL_BAR_STYLE', 'CHART_LAYOUT', 'CHART_OPTIONS',
	function($scope, QueryService, ViewTargets, selectedVersion, 
			 PASS_BAR_STYLE, FAIL_BAR_STYLE, CHART_LAYOUT, CHART_OPTIONS){

		var target = ViewTargets.currentTarget
		var passed = PASS_BAR_STYLE
		var failed = FAIL_BAR_STYLE

    $scope.data = [passed, failed];
    $scope.options = CHART_OPTIONS;
    $scope.layout = CHART_LAYOUT; 
   	$scope.layout.title = selectedVersion

    // load builds for selected versions
    QueryService.getBuilds(target, selectedVersion)
      	.then(function(builds){
				builds = builds.filter(function(b){ return (b.Passed + b.Failed) > 200})
				passed.x = failed.x = builds.map(function(b){ return b.build })
				passed.y = builds.map(function(b){ return b.Passed })
				failed.y = builds.map(function(b){ return b.Failed })
				$scope.data[0] = passed
				$scope.data[1] = failed
    	})

	}])


  .value('PASS_BAR_STYLE', {x: [], y: [], 
					    type: "bar", name: "Pass",
					    marker: {color: 'rgba(59, 201, 59, 0.70)'}})
  .value('FAIL_BAR_STYLE', {x: [], y: [], 
					    type: "bar", name: "Fail",
					    marker: {color: 'rgba(222, 0, 0, 0.70)'}})
  .value('CHART_LAYOUT', {height: 300, width: 800, title: ""})
  .value('CHART_OPTIONS', {showLink: false, displayLogo: false})



angular.module('svc.query', [])
	.service("QueryService",['$http', 'Data',
		function($http, Data){
		  return {
			getVersions: function(target){
				var url = ["versions", target].join("/")
		        return $http({"url": url, cache: true})
		        			.then(function(response){
		        				return response.data
		        			})
			},
			getBuilds: function(target, version){
				var url = ["builds", target, version].join("/")
		        return $http({"url": url, cache: true})
		        			.then(function(response){
		        				return response.data
		        			})				
			}
		  }
		}])

angular.module('ctl.sidebar', [])

.controller('SidebarCtrl', ['$scope', 'ViewService', 'Data', '$location',
  function ($scope, ViewService, Data, $location){

    // bind scope to data factory
    $scope.data = Data;

    // local scope bindings
    $scope.showAsPerc = true;
    $scope.showAllPlatforms = true;
    $scope.showAllCategories = true;
    $scope.PlatformsList = [];
    $scope.CategoriesList = [];
    $scope.didFirstSort = false;

    $scope.orderByPerc = function(el){

        // if already sorted by perc use old order 
        if ($scope.didFirstSort){
            return el.sortOrder;
        }   
        el.sortOrder = $scope.getPerc(el)*-100;
       return el.sortOrder;

    };

    $scope.objAsList = function(obj){
        var li = []; 
        for (var key in obj) {
            li.push(obj[key]);
        }
        return li;       
    };

    var resetSidebar = function() {
        $scope.selectedVersion = Data.selectedVersion;
        $scope.build = Data.selectedBuildObj;
        $scope.build.Passed = 0;
        $scope.build.Failed = 0;
        $scope.build.Pending = 0;
        $scope.showAllPlatforms = true;
        $scope.showAllCategories = true;

        if(Data.selectedBuildObj){
            $scope.Platforms = {};
            $scope.Categories = {};

            queryBreakdown().then(function(){

                var urlArgs = $location.search();
                var needsRefresh = false;
                if ("excluded_platforms" in urlArgs){
                  needsRefresh = true;
                  var platforms = urlArgs.excluded_platforms.split(",");
                  platforms.forEach(function(p){
                    _toggleItem({'Platform': p}, 'p');
                  });
                }
                if ("excluded_categories" in urlArgs){
                  needsRefresh = true;
                  var categories = urlArgs.excluded_categories.split(",")
                  categories.forEach(function(c){
                    _toggleItem({'Category': c}, 'c');
                  });
                }

                if (needsRefresh) {
                    updateBreakdown();
                }
            });
        }
    }

    $scope.$watch('data.refreshSidebar', function(newVal, oldVal){

        // update scope when data has been updated
        if (newVal == true){
          // build is same
          resetSidebar();
          Data.refreshSidebar = false;
        } else {
            // resort for new build
            $scope.didFirstSort = false;
        }

    });

    // handle % vs # slidler action
    $scope.didClickSlider = function(){
      $scope.showAsPerc = !$scope.showAsPerc;
    }

    $scope.getPercVal = function(item, val){
      if (!item){
        return 0;
      }

      var denom = item.Passed + item.Failed;
      if(denom == 0){ return 0; }
      return 100*(val/denom);
    }

    $scope.getPerc = function(item){
      if (!item){
        return 0;
      }

      var total = item.Passed + item.Failed;
      var denom = total + item.Pending;
      if(denom == 0){ return 0; }

      return total/denom;
    }

    var updateTotals = function (build){
        $scope.Categories[build.Category].Passed += build.Passed;
        $scope.Categories[build.Category].Failed += build.Failed;
        $scope.Categories[build.Category].Pending += build.Pending;
        $scope.Platforms[build.Platform].Passed += build.Passed;
        $scope.Platforms[build.Platform].Failed += build.Failed;
        $scope.Platforms[build.Platform].Pending += build.Pending;
        $scope.build.Passed += build.Passed;
        $scope.build.Failed += build.Failed;
        $scope.build.Pending += build.Pending;
    }

    var updateStatuses = function (build){
        
        var success = "bg-success";
        var warning = "bg-warning";
        var danger = "bg-danger";

        if ($scope.Platforms[build.Platform].Status != "greyed") {
            var fAbs = $scope.Platforms[build.Platform].Failed;
            if (fAbs > 0){
              var pAbs = $scope.Platforms[build.Platform].Passed;
              var fRel = 100.0*fAbs/(fAbs + pAbs);
             if (fRel > 30){
                   $scope.Platforms[build.Platform].Status = danger;
		          } else {
                   $scope.Platforms[build.Platform].Status = warning;
              }
            } else {
                $scope.Platforms[build.Platform].Status = success;
            }
        }

        if (($scope.Platforms[build.Platform].Passed == 0) &&
                ($scope.Platforms[build.Platform].Failed == 0)) {
            // did not run
             $scope.Platforms[build.Platform].Status = "disabled";
        }

        if ($scope.Categories[build.Category].Status != "greyed") {
          var fAbs = $scope.Categories[build.Category].Failed;
            if (fAbs > 0){
              var pAbs = $scope.Categories[build.Category].Passed;
              var fRel = 100.0*fAbs/(fAbs + pAbs);
              if (fRel > 30){
                     $scope.Categories[build.Category].Status = danger;
              } else {
                     $scope.Categories[build.Category].Status = warning;
              }
            } else {
                $scope.Categories[build.Category].Status = success;
            }
        }

        if (($scope.Categories[build.Category].Passed == 0) &&
                ($scope.Categories[build.Category].Failed == 0)) {
             $scope.Categories[build.Category].Status = "disabled";
        }

        var fAbs = $scope.build.Failed;
        if (fAbs == 0){
          $scope.build.Status = success;
        } else {
            var pAbs = $scope.build.Passed;
            var fRel = 100.0*fAbs/(fAbs + pAbs);
          if (fRel > 30){
            $scope.build.Status = danger;
          } else {
            $scope.build.Status = warning;
          }
        }
    }

    var queryBreakdown = function(platforms, categories){

      return ViewService.breakdown(Data.selectedBuildObj.Version, platforms, categories).then(function(response){

        // update totals for each platform and category
        response.forEach(function(build) {
          
          // add in new categories
          if (!(build.Category in $scope.Categories)) {
              $scope.Categories[build.Category] = {
                  "Category": build.Category,
                  "Passed": 0,
                  "Failed": 0,
                  "Pending": 0,
                  "Status": "bg-success",
                  "checked": true,
              };
          }
          if (!(build.Platform in $scope.Platforms)){
              $scope.Platforms[build.Platform] = {
                  "Platform": build.Platform,
                  "Passed": 0,
                  "Failed": 0,
                  "Pending": 0,
                  "Status": "bg-success",
                  "checked": true,
              };
          }

          // totals
          updateTotals(build);

          // status bars
          updateStatuses(build);

        });

      });
    }

    var updateBreakdown = function(){

      // update url
      var selectedBuild = Data.selectedBuildObj.Version;
      $scope.build.Passed = 0;
      $scope.build.Failed = 0;
      $scope.build.Pending = 0;
      $scope.build.Status = "bg-success";

      var platforms = [];
      var categories = [];

      Object.keys($scope.Categories).forEach(function(k){

        var item = $scope.Categories[k];
        item.Passed = 0;
        item.Failed = 0;
        item.Pending = 0;
        if (item.Status == "greyed"){
          if (categories.indexOf(k) < 0){
              categories.push(k);
          }
        } else {
          item.Status = "disabled";
        }
      });
      Object.keys($scope.Platforms).forEach(function(k){
        var item = $scope.Platforms[k];
        item.Passed = 0;
        item.Failed = 0;
        item.Pending = 0;
        if (item.Status == "greyed"){
          if (platforms.indexOf(k) < 0){
              platforms.push(k);
          }
        } else {
          item.Status = "disabled";
        }
      });

      // if all platforms|categories excluded toggle showAll flags
      if (platforms.length > 0 &&
          (platforms.length == Object.keys($scope.Platforms).length)){
        $scope.showAllPlatforms = false;
      } else if(platforms.length == 0){ // exclude none
        $scope.showAllPlatforms = true;
      }

      if (categories.length > 0 &&
          (categories.length  == Object.keys($scope.Categories).length)){
        $scope.showAllCategories = false;
      } else if(categories.length == 0){
        $scope.showAllCategories = true;
      }

      var platformParam = null;
      var categoryParam = null;
      if (platforms.length > 0){
        platformParam =  platforms.toString();
      }
      if (categories.length > 0){
        categoryParam = categories.toString();
      }

      $location.search("excluded_platforms", platformParam);
      $location.search("excluded_categories", categoryParam);

      Data.refreshJobs = true;
      return queryBreakdown(platforms, categories);
    }



    // handle click 'all' toggle button
    $scope.toggleAll = function(itype){

        var items;
        if (itype == "c"){
            items = $scope.Categories;
            $scope.showAllCategories = !$scope.showAllCategories;
        }
        else {
            items = $scope.Platforms;
            $scope.showAllPlatforms = !$scope.showAllPlatforms;

        }

        Object.keys(items).forEach(function(item){
          var key = items[item];
          if (itype == "c"){
            key.checked = !$scope.showAllCategories;
          } else {
            key.checked = !$scope.showAllPlatforms;
          }
          _toggleItem(key, itype);

        });
        updateBreakdown();
    }


    // handle de/select individual sidebar items
    $scope.toggleItem = function(key, itype){

        // assuming after an item has been click sort has already happened
        $scope.didFirstSort = true;

        // if all items are highlighted first do a toggle all
        if (itype == "c"){
          var categories = Object.keys($scope.Categories);
          var sel = categories.filter(function(k){
            return $scope.Categories[k].checked;
          });
          if ((sel.length > 1) && (sel.length == categories.length)){
            $scope.toggleAll("c");
          }
        } else {
          var platforms = Object.keys($scope.Platforms);
          var sel = platforms.filter(function(k){
            return $scope.Platforms[k].checked;
          });
          if ((sel.length > 1) && (sel.length == platforms.length)){
            $scope.toggleAll("p");
          }
        }


        _toggleItem(key, itype);
        updateBreakdown();

    }

    function _toggleItem(key, itype){
        var selected;
        var item;
        if (itype == "c"){
            item = key.Category;
            selected = $scope.Categories[item];
        }
        else {
            item = key.Platform;
            selected = $scope.Platforms[item];
        }
        if (selected.checked){
            // toggle checked item to greyed state
            selected.Status = "greyed";
        } else {
            selected.Status = "bg-success";
        }
        selected.checked = !selected.checked;
    }

}])

angular.module('app.target', [])

  .directive('targetSelector', ['$stateParams','ViewTargets', 'Data',
  	function($stateParams, ViewTargets, Data){
 	  	return {
	  		restrict: 'E',
	  		scope: {
	  			target: "=",
	  			changeTarget: "="
	  		},
	  		templateUrl: 'partials/targets.html',
	  		link: function(scope, elem, attrs){

	  			// watch changes from parent scope
	  			scope.$watch(attrs.target, function(target){
	  				if(!target) { return }

		  			// configure drop down to show all targets
					scope.viewTargets = ViewTargets.allTargets()

					// set currently viewed scope target
					scope.targetBy = ViewTargets.getTarget(target)	
	  			})


	  		}
	  	}
  }])

  .directive('versionSelector', ['$stateParams', 'ViewTargets', 'QueryService', 'Data',
  	function($stateParams, ViewTargets, QueryService, Data){
	  	return {
	  		restrict: 'E',
	  		templateUrl: 'partials/versions.html',
	  		scope: {
	  			version: "=",
	  			changeVersion: "="
	  		},
	  		link: function(scope, elem, attrs){
	
	  			scope.$watch(attrs.version, function(version){
	  			  	if(version){
			  			scope.targetVersions = Data.getTargetVersions()
			  		}
	  			})
	  		}
	  	}
  }])


  .factory('ViewTargets', ['COUCHBASE_TARGET', 'SDK_TARGET', 'MOBILE_TARGET', 
  	function (COUCHBASE_TARGET, SDK_TARGET, MOBILE_TARGET){

      var viewTargets = [COUCHBASE_TARGET, SDK_TARGET, MOBILE_TARGET]
      var targetMap = {} // reverse lookup map

      // allow reverse lookup by bucket
      viewTargets = viewTargets.map(function(t, i){
        t['i'] = i
        targetMap[t.bucket] = t
        return t
      })

      return {
            allTargets: function(){ 
            	return viewTargets
            },
            getTarget: function(target){ 
            	return targetMap[target]
            }
        }
  }])


 .value('COUCHBASE_TARGET', {
        "title": "Couchbase Server",
        "bucket": "server",
        "key": "abspassed",
        "value": 100,
        "options": [0, 50, 100, 500]
  })
 .value('SDK_TARGET', {
        "title": "SDK",
        "bucket": "sdk",
        "key": "abspassed",
        "value": 100,
        "options": [0, 50, 100, 500]
  })
 .value('MOBILE_TARGET', {
        "title": "Mobile",
        "bucket": "mobile",
        "key": "abspassed",
        "value": 0,
        "options": [0, 50, 100, 500]
  })



angular.module('app.timeline', ['plotly'])

  .controller('TimelineCtrl', ['$scope', 'QueryService', 'Data', 
  	                          'PASS_BAR_STYLE', 'FAIL_BAR_STYLE', 'CHART_LAYOUT', 'CHART_OPTIONS',
	function($scope, QueryService, Data, 
			 PASS_BAR_STYLE, FAIL_BAR_STYLE, CHART_LAYOUT, CHART_OPTIONS){

		var passed = PASS_BAR_STYLE
		var failed = FAIL_BAR_STYLE

	    $scope.data = [passed, failed];
	    $scope.options = CHART_OPTIONS;
	    $scope.layout = CHART_LAYOUT; 

	 	$scope._data = Data

	 	// update plot data whenever selected version changes
		$scope.$watch('_data.getSelectedVersion()', function(selectedVersion){

			if(!selectedVersion){ return }

			// get target/bucket to query
			var target = Data.getCurrentTarget()

			// set plot title to selected version
		   	$scope.layout.title = selectedVersion

		    // load build data for selected versions
		    QueryService.getBuilds(target, selectedVersion)
		      	.then(function(builds){
						builds = builds.filter(function(b){ return (b.Passed + b.Failed) > 200})
						passed.x = failed.x = builds.map(function(b){ return b.build })
						passed.y = builds.map(function(b){ return b.Passed })
						failed.y = builds.map(function(b){ return b.Failed })
						$scope.data[0] = passed
						$scope.data[1] = failed
		    	})
	      })

	}])


  .value('PASS_BAR_STYLE', {x: [], y: [], 
					    type: "bar", name: "Pass",
					    marker: {color: 'rgba(59, 201, 59, 0.70)'}})
  .value('FAIL_BAR_STYLE', {x: [], y: [], 
					    type: "bar", name: "Fail",
					    marker: {color: 'rgba(222, 0, 0, 0.70)'}})
  .value('CHART_LAYOUT', {height: 300, width: 800, title: ""})
  .value('CHART_OPTIONS', {showLink: false, displayLogo: false})

