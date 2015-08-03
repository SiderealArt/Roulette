var fire = new Firebase('https://z358z358-roulette.firebaseio.com/');
$.cookie.json = true;

var vue = new Vue({
  el: '#main',
  data: {
    set:{
      options:[
        {name:'1', weight:1},
        {name:'2', weight:1},
        {name:'3', weight:1},
        {name:'4', weight:1},
      ],
      title:'預設轉盤',
      ts:0,
      hot:0,
      uid:'',
    },

    c:{
      setTurn: 1,
      duration: 3000,
    },

    user:{
      provider:'',
      uid:'',
      displayName:'',
    },
    
    cookieKey: 'z358z358-roulette',
    rid: '',    
    turnFlag: -1,
    goFlag: false,
    saveType:'',
    angle: 0,
    target: 0,
    turn: 0,
    sum: 0,
    logs:[],
    list:[],
  },

  watch: {
    // timeago
    'logs': function (val, oldVal) {
      jQuery(".timeago").timeago();
    },

    // timeago
    'list': function (val, oldVal) {
      jQuery(".timeago").timeago();
    }
  },

  filters: {
    persent: function (number) {
      return Math.round(number*100) + '%';
    }
  },

  ready: function(){
    //this.draw();
    if(window.location.hash){
      this.rid = window.location.hash.substring(1); //Puts hash in variable, and removes the # character
      this.loadOption(this.rid);
    }

    var authData = fire.getAuth();
    if(authData){
      this.loginBack(authData);
    }

    var c = $.cookie(this.cookieKey);
    if(c){
      this.c = c;
    }    
  },

  methods: {
    draw: function(offset){
      var tmp = [['名稱', '比重']];
      this.set.options.map(function(option){
        var weight = parseFloat(option.weight, 10);
        tmp.push([option.name,weight]);
      });

      var data = google.visualization.arrayToDataTable(tmp);

      var options = {
        pieSliceText: 'label',
        title: this.set.title,
        pieHole: 0.3,
        legend:{alignment:'center','position':'bottom'}
        //slices: offset,
      };
      var chart = new google.visualization.PieChart(document.getElementById('piechart'));
      chart.draw(data, options);
      $.unblockUI();
      $.cookie(this.cookieKey, this.c, { path: '/' , expires: 365});
    },

    addOption: function(){
      this.set.options.unshift({name:'',weight:''});
    },

    removeOption: function (option) {
      this.set.options.$remove(option.$data);
    },

    go: function(type){
      var options = this.set.options;
      var oldAngle = this.angle;
      var addAngle = Math.floor((Math.random() * 360));
      var sum = 0;
      var tmp = 0;

      if(this.goFlag == true){
        return;
      }

      if(type == 'c'){
        this.turnFlag = this.c.setTurn;        
      }

      options.map(function(option){
        sum += parseFloat(option.weight, 10);
      });
      this.sum = sum;

      //console.log(addAngle);
      for (var i = 0; i <= options.length - 1; i++) {
        tmp += (options[i].weight / sum) * 360;
        //console.log(tmp,i,options[i].weight / sum);
        if( tmp >= addAngle ){
          this.target = i;
          break;
        }
      };

      this.goFlag = true;
      this.angle = addAngle;
      $("#lotteryBtn").rotate({
        angle:oldAngle, 
        duration: this.c.duration,
        animateTo: addAngle + 1800,
        callback:this.goDone,
      }); 
    },

    goDone: function(){
      var a = {};
      var log = {};
      var times = (parseInt(this.set.options[this.target].times) || 0) + 1;      
      this.goFlag = false;
      this.turn = this.turn + 1;          
      this.draw(a);

      log.ts = new Date().getTime();
      log.target = this.target;
      log.content = this.set.options[this.target].name;
      this.logs.unshift(log);
      if(this.logs.length > 500){
        this.logs.pop();
      }

      this.set.options[log.target].$set('times',times);
      if(this.turnFlag >= 1) {
        this.turnFlag--;
        if(this.turnFlag >= 1){
          this.go();
        }        
      }
    },

    saveOnFireBase: function(){
      var that = this;
      var tmp = $.extend( {}, this.set );
      var tmp2;

      tmp.ts = new Date().getTime();
      for (var i = tmp.options.length - 1; i >= 0; i--) {
        delete tmp.options[i].times;
      };
      delete tmp.hot;

      if(tmp.uid && tmp.uid === this.user.uid && this.rid){
        fire.child('list/' + this.rid).update(tmp, function(error){
          if (error) {
            that.$set('errorMsg' , '儲存轉盤失敗!');
          }
        });
      }
      else {
        console.log('新增');
        tmp.hot = 0;
        this.set.uid = tmp.uid = this.user.uid;
        tmp2 = fire.child('list').push(tmp);
        if(!tmp2){
          this.$set('errorMsg' , '新增轉盤失敗!');
          return;
        }
        this.rid = window.location.hash = tmp2.key();        
      }

      this.draw();
    },

    getList: function(type){
      var that = this;
      var title = (type == 'hot') ? '熱門轉盤' : '最新上架' ;
      var tmp = fire.child('list');      
      var type2 = (type == 'my') ? 'ts' : type ;

      title = (type == 'my') ? '我的轉盤' : title ;
      this.$set('listType' , type2);
      this.$set('listTitle' , title);

      if(type == 'my' && this.user.uid){
        tmp = tmp.orderByChild('uid').equalTo(this.user.uid);
      }
      else{
        tmp = tmp.orderByChild(type2);
      }

      tmp.limitToLast(50).once("value", function(snapshot) {
        console.log(snapshot);
        var tmp = [];
        snapshot.forEach(function(data) {
          var a = data.val();
          a.id = data.key();
          tmp.push(a);
        });

        that.list = tmp;        
      });
    },

    loadOption: function(id){
      var tmp = fire.child('list/' + id);
      tmp.once("value", this.setOptions); 
      $("#list-modal").modal('hide');
      $(".navbar-toggle").click();  
    },

    setOptions: function(snapshot){
      if(snapshot.exists() === false) {
        this.rid = '';
        return;
      }

      var tmp = snapshot.val();
      this.set = tmp;
      this.draw();
      this.rid = snapshot.key();
      FB.XFBML.parse(); 
      this.incHot(snapshot.key());  
      
    },

    // 人氣+1
    incHot: function(id){
      fire.child('list/' + id + '/hot').transaction(function (current_value) {
        return (current_value || 0) + 1;
      });
    },

    login: function(type){
      var that = this;
      if(type == 'logout'){
        fire.unauth();
        this.$set('user', {uid:'',provider:'',displayName:''});
      }
      else{
        fire.authWithOAuthPopup(type, function(error, authData) {
          if (error) {
            //console.log("Login Failed!", error);
          } else {
            that.loginBack(authData);          
          }
        });
      }
    },

    loginBack: function(authData){
      //console.log("Authenticated successfully with payload:", authData , that);
      this.user.uid = authData.uid;
      this.user.provider = authData.provider;    
      this.user.displayName = authData[this.user.provider].displayName;
      $(".navbar-toggle").click();
    },

    deleteLog: function(type){
      if(type == 'all'){
        this.$set('logs', []);
        this.set.options.map(function(option){
          option.$set('times', 0);
        });
        this.turn = 0;
      }
    }
  }
});


google.load("visualization", "1", {packages:["corechart"]});
google.setOnLoadCallback(vue.draw);

$( window ).resize(vue.draw);

$(function(){
  $.blockUI({ message: '<h1><i class="fa fa-spinner fa-pulse"></i> 載入中...</h1>' }); 
});