require('./locals/zh-CN.properties');
// require('./locals/en-US.properties');
var angular = require('angular');

require('./test.css');

require('./app.less');
// require('./app.scss');

var template = require('./template.html');

require('@damo/cli-l20n/dist/ng/1.0.0/l20n');

angular.module('testApp', ['ngL20n'])
  .run(['$rootScope', 'l20n', function($rootScope, l20n) {
    $rootScope.locale = 'zh-CN';
    $rootScope.l20nId = 'objectsWithCount';
    $rootScope.data = {
      objectsNum: 102,
      testNumber: 0
    };
    

    function setObjectsNum(number) {
      l20n.update($rootScope.l20nId, {
        objectsNum: number,
      });
    }

    $rootScope.$watch('data.objectsNum', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        setObjectsNum(parseInt(newValue, 10) || 0);
      }
    });

    l20n.ready(function() {
      l20n.getAsync('data.overlayed', {
        objectsNum: 2
      }).then(function(val) {
        alert(val);
      });

      setObjectsNum(parseInt($rootScope.data.objectsNum, 10) || 0);
    });
    angular.element(document.body).append(template);

  }]);
  
  
  // require('./react-main');