RedisInternals.RemoteCollectionDriver = function (
  url, options) {
  var self = this;
  self.connection = new RedisConnection(url, options);
};

_.extend(RedisInternals.RemoteCollectionDriver.prototype, {
  open: function (name) {
    var self = this;
    var ret = {};
    _.each(
      ['find', 'findOne', 'insert', 'update', , 'upsert',
       'remove', '_ensureIndex', '_dropIndex', '_createCappedCollection',
       'dropCollection'],
      function (m) {
        ret[m] = function () {
          throw new Error(m + ' is not available on REDIS! XXX');
        };
      });
      _.each(['keys', 'matching', 'get',
              'set', 'setex', 'append', 'del',
              'incr', 'incrby', 'incrbyfloat', 'decr', 'decrby',
              'hgetall', 'hmset', 'hincrby', '_keys_hgetall', '_observe', 'flushall'],
        function (m) {
          ret[m] = function (/* args */) {
            var args = _.toArray(arguments);
            var cb = args.pop();

            if (_.isFunction(cb)) {
              args.push(function (err, res) {
                // In Meteor the first argument (error) passed to the
                // callback is undefined if no error occurred.
                if (err === null) err = undefined;
                cb(err, res);
              });
            } else {
              args.push(cb);
            }

            return self.connection[m].apply(self.connection, args);
          };
        });
    return ret;
  }
});


// Create the singleton RemoteCollectionDriver only on demand, so we
// only require Mongo configuration if it's actually used (eg, not if
// you're only trying to receive data from a remote DDP server.)
RedisInternals.defaultRemoteCollectionDriver = _.once(function () {
  var redisUrl = process.env.REDIS_URL;

  var connectionOptions = {};
  var configureKeyspaceNotifications = process.env.REDIS_CONFIGURE_KEYSPACE_NOTIFICATIONS;
  if (configureKeyspaceNotifications) {
    connectionOptions.configureKeyspaceNotifications = configureKeyspaceNotifications;
  }

  if (! redisUrl) {
    redisUrl = 'redis://127.0.0.1:6379';
    Meteor._debug("Defaulting REDIS_URL to " + redisUrl);
  }

  return new RedisInternals.RemoteCollectionDriver(redisUrl, connectionOptions);
});
