import { MediaService, MessageService, NotificationService, UserService, EventService } from './services';
import { userMapper } from './services/userService/model/userDto';
import { conversationMapper, conversationsMapper } from './services/messageService/model/conversationDto';

const Formidable = require('formidable');
const config = require('../config');
const image = require('../util/gcloud-util')(config.gcloud, config.cloudImageStorageBucket);
const audio = require('../util/gcloud-util')(config.gcloud, config.cloudAudioStorageBucket);
const bcrypt = require('bcrypt-nodejs');
const fs = require('fs');

const regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g)
function escaper(char){
  const m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', '\\', '\\\\', '%'];
  const r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%'];
  return r[m.indexOf(char)];
};

const DEFAULT_QUERY_SIZE = 30;

module.exports = function (app, options) {
  const m_userService = new UserService(options);
  const m_messageService = new MessageService(options);
  const m_eventService = new EventService(options);
  const m_mediaSerivce = new MediaService(options);
  const m_notificationService = new NotificationService(options);

  app.get(`/database`, (req, res) => {
    options.connect(options.database, (connection) => {
      if(connection.status === `SUCCESS`){
        res.status(200).send();
      } else {
        res.status(500).send();
      }
    });
  });

  app.get(`/user/me`, options.auth, (req, res) => {
    res.redirect(`/user/${req.user.id}`);
  });

  app.get(`/user/search/{text}`, options.auth, (req, res) => {
    if (req.params.text.length === 0) {
      res.status(400).send();
    } else {
      //elasticsearch for users
    }
  });

  /**USER API**/

  app.post(`/user/edit`, options.auth, options.auth, (req, res) => {
    console.log(req.body) // <- standard for getting things out post.

    options.connect(options.database, (connection) => {
      console.log(connection);
    });
    res.send(`lol`);
  });

  app.post('/register', (req, res) => {
    console.log(req.body);
    if (req.body.email == null || req.body.password == null) {
      res.status(400).json({ badRequest: 'empty username or password' });
      return;
    }

    if (req.body.firstName == null || req.body.lastName == null) {
      res.status(400).json({ badRequest: 'empty firstname or lastname' });
      return;
    }

    bcrypt.hash(req.body.password, null, null, (err, password) => {
      if (err) {
        res.status(500).send();
        return;
      }
      
      m_userService.registerUser(req.body.email, password, req.body.firstName, req.body.lastName)
        .then(user => res.json(user))
        .catch(error => res.status(500).json(error));
    });
  });

  app.post('/user/profile/:userId', options.auth, (req, res) => {
    if (req.user.id != req.params.userId) {
      res.status(400).send();
      return;
    }

    m_userService.updateProfile(req.body, () => {
      res.status(201).send();
    });
  });

  app.get('/user/:id', options.auth, (req, res) => {
    if (!req.user) {
      res.status(400).send();
      return;
    }

    m_userService.getUser(req.params.id, (user) => {
      if (user == null) {
        res.status(404).send();
        return;
      }

      res.send(user);
    });
  });

  app.post('/user/edit/picture/new', options.auth, (req, res) => {
    if (!req.user) {
      res.status(400).send();
    }

    uploadPicture(req, res, (gcloudResponse) => {
      if (gcloudResponse == null) {
        res.status(500).send();
        return;
      }

      options.connect(options.database, (connection) => {
        const user = [];
        connection.client.query(`INSERT INTO pictures (user_id, filename, picture_type) VALUES (${req.user.id}, '${gcloudResponse.cloudStorageObject}', 1);`)
        .on(`row`, (row) => { user.push(row); })
        .on(`error`, (error) => { console.log(`error encountered ${error}`) })
        .on(`end`, () => {
          connection.done();
          res.status(200).send(gcloudResponse);
        });
      });
    });
  });

  app.post('/user/follow/:userId', options.auth, (req, res) => {
    if (!req.user) {
      res.status(400).send();
    }

    if (req.user.id === parseInt(req.params.userId, 10)) {
      res.status(204).send();
    }

    options.connect(options.database, (connection) => {
      connection.client.query(`
        INSERT INTO followers (origin, destination)
        SELECT 1, 2
        WHERE
          NOT EXISTS (
            SELECT * FROM followers WHERE origin = ${req.user.id} AND destination = ${req.params.userId}
          );
      `).on('error', error => { console.log(`error following user: ${error}`); })
      .on('end', () => {
        connection.done();
        res.status(200).send();
      });
    });
  });

  /** *PICTURES API* **/


  // Currently only works with one picture. No mass upload.
  const uploadPicture = (req, res, next) => {
    const form = new Formidable.IncomingForm();
    form.maxFieldsSize = 50 * 1024 * 1024;

    form.onPart = (part) => {
      form.handlePart(part);
    }

    form.parse(req, (err, fields) => {
      const buffer = new Buffer(fields[Object.keys(fields)[0]], 'base64');
      const splits = Object.keys(fields)[0].split('.');

      image.sendUploadToGCS(splits[splits.length - 1], buffer)
      .then(response => {})
      .catch(error => {
        console.log(error);
      });
    });
  };

  /** MUSIC API */
  /**
   * audioUrl, author, coverUrl, createdDate, description, durations, id, name, size
   */

  /** queryParams: limit, offset */
  app.get('/music/user', (req, res) => {
    if (!req.user) {
      return res.status(404).send();
    }

    const options = { limit: req.query.limit, offset: req.query.offset  }
    
    m_mediaSerivce.getMusicByUser(req.user.id, options)
      .then(result => res.json(result))
      .catch(error => {
        console.log(error);
        res.json(error);
      });
  });

  app.post('/post-blob', options.auth, (req, res) => {
    const form = new Formidable.IncomingForm();
    form.uploadDir = '/uploads';

    form.parse(req, (err, fields, files) => {
      const buffer = new Buffer(fields.file, 'base64');
      audio.sendUploadToGCS(fields.extension ? fields.extension : `.mp3`, buffer)
        .then(result => {
          m_mediaSerivce.createMusic({ audioUrl: result.cloudStoragePublicUrl, author: req.user.id, createdDate: new Date().toISOString(), name: fields.name, size: fields.size })
            .then((id) => {
              res.status(201).json({ id });
            })
            .catch(error => {
              res.json(error);
            });
        })
        .catch(response => {
          console.log(response.error);
          res.status(500).send();
          return;
        });
    });
  });

  /** Notifications API **/
  // app.post('/notifications', options.auth, (req, res) => {});
  /** queryParams: ids(optional) */
  // app.get('/notifications', options.auth, (req, res) => {});
  // app.get('/notifications/:notificationId', options.auth, (req, res) => {});
  /** queryParams: ids(optional) */
  // app.post('/notifications/markread', options.auth, (req, res) => {});
  // app.post('/notifications/delete/{notificationId}', options.auth, (req, res) => {});

  /** body: { createdDate, kind, recipientId, sourceId, status  } */
  app.post('/notifications', options.auth, (req, res) => {
    if (req.user == null) {
      res.status(404).send();
      return;
    }

    if (req.body.kind == null || req.body.recipientId == null || req.body.sourceId == null) {
      req.status(403).send();
    }

    m_notificationService.createNotification({
      kind: req.body.kind,
      recipientId: req.body.recipientId,
      sourceId: req.body.sourceId,
      status: req.body.status
    })
      .then(() => {
        res.status(201).send();
      })
      .catch(error => {
        res.json(error);
      });
  });

  /** queryParams(optional): ids, limit, offsetId, status */
  app.get('/notifications', options.auth, (req, res) => {
    if (req.user == null) {
      res.status(404).send();
    }

    if (req.query != null && req.query.ids == null) {
      m_notificationService.getNotificationsByUser(req.user.id, req.query.limit || DEFAULT_QUERY_SIZE, req.query.offsetId || 0, req.query.status || 0)
       .then(notifications => res.json(notifications))
       .catch(error => res.json(error));
    } else {
      m_notificationService.getNotifications(req.query.ids, req.query.limit || DEFAULT_QUERY_SIZE, req.query.status || 0)
        .then(notifications => res.json(notifications))
        .catch(error => res.json(errors));
    }
  });

  /** routeParams: notificationId */
  app.get('/notifications/:notificationId', options.auth, (req, res) => {
    if (req.user == null) {
      res.status(404).send();
      return;
    }

    m_notificationService.getNotification(req.params.notificationId)
      .then(notification => res.json(notification))
      .catch(error => res.json(error));
  });

  /** queryParams: ids(optional) */
  app.post('/notifications/markread', options.auth, (req, res) => {
    if (req.user == null) {
      res.status(404).send();
      return;
    }

    m_notificationService.markNotificationsAsRead(req.user.id, req.query.ids)
      .then(() => res.status(204).send())
      .catch(error => res.json(error));
  });

  /** routeParams: notificationId */
  app.post('/notifications/delete/{notificationId}', options.auth, (req, res) => {
    if (req.user == null) {
      res.status(404).send();
      return;
    }

    m_notificationService.deleteNotification(req.params.notificationId)
      .then(() => res.status(204).send())
      .catch(error => res.json(error));
  });

  /** MESSAGES API ***/
  /**
   * MESSAGE {
   *  CONTENT
   *  ID
   *  SOURCE
   *  DESTINATION
   *  CONVERSATION
   * }
   * 
   * SEQUENCE CONVERSATION ID
   * 
   * CONVERSATION {
   *  USERID
   *  CONVERSATIONID
   *  LAST READ MESSAGE
   *  ID
   * }
   * 
   * GET CONVERSATION BY ID
   * GET CONVERSATIONS BY USER ID
   * GET MESSAGE BY ID
   * GET MESSAGES BY CONVERSATION ID
   * GET MESSAGE BY ID
   */

  app.post('/conversations', options.auth, (req, res) => {
    if (!req.user) {
      res.status(404).send();
      return;
    }

    const userIds = req.body.userIds.split(',');
    m_messageService.createConversation(userIds)
      .then(result => {
        if (typeof(result) === 'object') {
          res.status(200).json(result);
        } else {
          res.status(201).json({ conversationId: result });
        }
      })
      .catch(error => {
        res.status(500).json(error);
      });
  });

  app.get('/conversations', options.auth, (req, res) => {
    if (!req.user) {
      res.status(404).send();
    } else {
      m_messageService.getConversationsByUserId(req.user.id)
        .then(conversations => {
          const userIds = [ ...new Set(conversations.map(x => x.user_id)) ];
          m_userService.getUsers(userIds, (users) => {
            res.status(200).json(conversationsMapper(users, conversations));
          });
        })
        .catch(error => {
          res.status(500).json(error);
        });
    }
  });
  
  app.get('/conversation/:conversationId', options.auth, (req, res) => {
    if (!req.user) {
      res.status(404).send();
    } else if (req.params.conversationId == null) {
      res.status(400).send();
    } else {
      m_messageService.getConversation(req.params.conversationId, req.user.id)
        .then(conversation => {
          // TODO: support groups or multiple userIds
          const userIds = [ ...new Set(conversation.messages.map(x => x.user_id)) ];
          m_userService.getUsers(userIds, (users) => {
            res.status(200).json(conversationMapper(users, conversation));
          });
        })
        .catch(error => {
          res.status(500).json(error);
        });
    }
  });

  app.get('/message/:messageId', options.auth, (req, res) => {
    if (!req.user) {
      res.status(404).send();
      return;
    }

    if (req.params.messageId == null) {
      res.status(400).send();
      return;
    }

    m_messageService.getMessage(req.params.messageId, req.user.id)
      .then(message => {
        res.status(200).json(message);
      })
      .catch(error => {
        res.status(500).json(error);
      })
  });

  app.get('/messages/:conversationId', options.auth, (req,res) => {
    if (req.user == null) {
      res.status(404).send();
    } else if (req.params.conversationId == null) {
      res.status(400).send();
    } else {
      m_messageService.getMessages(req.user.id, req.params.conversationId, req.query.start, req.query.count)
        .then(messages => {
          res.status(200).json(messages);
        })
        .catch(error => {
          res.status(500).json(error);
        });
    }
  });

  app.post('/messages', options.auth, (req, res) => {
    if (!req.user) {
      res.status(404).send();
      return;
    }

    if (req.body.content == null || req.body.conversationId == null) {
      res.status(400).send();
      return;
    }

    m_messageService.createMessage(req.body.conversationId, req.body.userId, req.body.content, req.body.destinationId)
      .then(messageId => {
        res.status(201).json({ messageId });
        return;
      })
      .catch(error => {
        res.status(500).json(error);
      });
  });

  app.delete('/message/:messageId', options.auth, (req, res) => {
    if (req.user == null) {
      res.status(404).send();
      return;
    } else if (req.params.messageId == null) {
      res.status(400).send();
    }

    m_messageService.deleteMessage(req.params.messageId)
      .then(count => {
        res.status(200).json(count);
      })
      .catch(error => {
        res.status(500).json(error);
      });
  });
  
  app.delete('/conversation/:conversationId', options.auth, (req, res) => {
    if (req.user == null) {
      res.status(404).send();
      return;
    } else if (req.params.conversationId == null) {
      res.status(400).send();
    }

    m_messageService.deleteConversation(req.params.conversationId)
      .then(count => {
        res.status(200).json(count);
      })
      .catch(error => {
        res.status(500).json(error);
      });
  });

  /** Events API - consider moving the queries to elasticsearch to order by popularity of events and user ratings **/

  app.get('/api/events', (req, res) => {
    m_eventService.getEventsByLocation()
      .then((events) => {
        res.status(200).json(events);
      })
      .catch((error) => {
        res.status(500).send(error);
      });
  });

  app.get('/api/events/nearby', (req, res) => {
    if (req.query.lat == null || req.query.lng == null || req.query.radius == null) {
      res.status(400).send({
        error: 'The request is missing some parameters'
      });
    }

    const maxLat = parseFloat(req.query.lat) + req.query.radius/69.172;
    const minLat = req.query.lat - req.query.radius/69.172;
    // compensate for degrees longitude getting smaller with increasing latitude
    const diff = req.query.radius/(Math.cos(req.query.lat)*69.172);
    const maxLon = parseFloat(req.query.lng) + Math.abs(diff);
    const minLon = parseFloat(req.query.lng) - Math.abs(diff);

    options.connect(options.database, (connection) => {
      const events = [];
      connection.client
      .query(`
      WITH FirstCut AS (
        SELECT * FROM events WHERE
            cast(latitude as double precision) < ${maxLat} AND cast(latitude as double precision) > ${minLat}
            AND cast(longitude as double precision) < ${maxLon} AND cast(longitude as double precision) > ${minLon}
      )
      SELECT * FROM FirstCut WHERE
        sqrt(
          power(
            (cast(longitude as double precision) - ${req.query.lng})*
            (68.7*cos(radians(cast(latitude as double precision))))
          , 2) +
          power(
            (cast(latitude as double precision) - ${req.query.lat})*
            69.172
          , 2)
        ) < ${req.query.radius};
      `).on('error', (error) => {
        console.log(error);
      }).on('row', (row) => {
        events.push(row);
      }).on('end', () => {
        res.status(200).send(events);
      });
    });
  });

  app.post('/api/events/create', options.auth, (req, res) => {
    const event = req.body;
    options.connect(options.database, (connection) => {
      let eventId = -1;
      connection.client
      .query(`INSERT INTO events (name, notes, latitude, longitude, start_date, end_date, user_id) VALUES
        (
          '${event.eventName.replace(regex, escaper)}',
          '${event.notes.replace(regex, escaper)}',
          '${event.eventLatitude}',
          '${event.eventLongitude}',
          '${event.startDate}',
          '${event.endDate}',
          ${req.user.id}
        );
        SELECT LASTVAL();
      `).on('error', (error) => {
        console.log(`${error}`);
        res.status(500).send();
      }).on('row', (id) => {
        eventId = id;
      }).on('end', () => {
        console.log(eventId);
        res.status(200).send(eventId);
      });
    });
  });

  app.get(`/events/nearby/{location}`, options.auth, (req, res) => {
    res.status(204).send();
    //how the hell do you search based on location?
  });

  //filter should be either host_average_rating OR event_committed_attendees
  app.get(`/events/filter/{type}/{instrument}/{index}/{filter}`, options.auth, (req, res) => {
    if (req.params.instrument.length === 0 && req.params.type.length === 0) {
      res.status(400).send();
    } else {
      let index = 0;
      let query = ``;

      if (req.params.instrument.length === 0) {
        query = `type = '${req.params.type}'`;
      } else if (req.params.type.length === 0) {
        query = `instrument '${req.params.instrument}'`;
      } else {
        query = `instrument '${req.params.instrument}' AND type = '${req.params.type}'`;
      }

      if (req.params.index) {
        index = req.params.index;
      }

      index = 10 * index;

      options.connect(options.database, (connection) => {
        const events = [];

        //doesn't currently exclusively get events that haven't happened yet.j
        connection.client
        .query(`SELECT * FROM public.events WHERE ${query} LIMIT 10 OFFSET ${index} ORDER BY ${req.params.filter} DESC;`)
        .on(`row`, (row) => {
          events.push(row);
        }).on(`end`, () => {
          res.send(events);
          connection.done();
        });
      });
    }
  });

  app.get(`/events/user/{userId}`, options.auth, (req, res) => {
    if (!req.params.userId) {
      res.status(400).send();
    } else {
      options.connect(options.database, (connection) => {
        const events = [];

        connection.client
        .query(`SELECT * FROM public.events WHERE user_id = ${req.params.userId};`)
        .on(`row`, (row) => {
          events.push(row);
        }).on(`end`, () => {
          res.send(events);
          connection.done();
        });
      });
    }
  });
/** **/

/** DOCUMENTS API **/

  //Retrieve all song documents owned by user
  app.get('/songs/user', options.auth, (req, res) => {
    if(!req.user) {
      res.status(400).send();
    } else {
      options.connect(options.database, (connection) => {
        const songs = [];
        connection.client.query(`SELECT id, title, description, date, modified, profiles FROM public.documents WHERE ${req.user.id} = ANY (SELECT unnest(profiles) from public.documents);`)
        .on(`row`, (row) => { songs.push(row); })
        .on(`end`, () => {
          res.send(songs);
          connection.done();
        });
      });
    }
  });

  app.get('/document/:documentId', options.auth, (req, res) => {
    if(!req.user) {
      res.status(400).send();
    }
    options.connect(options.database, (connection) => {
      const song = [];
      connection.client.query(`SELECT * FROM public.documents
        WHERE ${req.user.id} = ANY (SELECT unnest(profiles) from public.documents) AND ${req.params.documentId} = id;`)
      .on(`row`, (row) => { song.push(row); })
      .on(`end`, () => {
        if(song.length > 0 ) {
          res.send(song[0]);
          connection.done();
        }
        res.status(404).send();
      });
    });
  });

  app.post('/document/:documentId', options.auth, (req, res) => {
    if(!req.user) {
      res.status(400).send();
    }
    options.connect(options.database, (connection) => {
      const song = [];
      connection.client.query(`SELECT id, title, description, date, modified, profiles FROM public.documents
        WHERE ${req.user.id} = ANY (SELECT unnest(profiles) from public.documents) AND ${req.params.documentId} = id;`)
      .on(`row`, (row) => { song.push(row); })
      .on(`error`, (error) => { console.log(`error encountered ${error}`) })
      .on(`end`, () => {
        if(song.length > 0){
          connection.client.query(`UPDATE public.documents SET contents = '${JSON.stringify(req.body)}', modified = current_timestamp
            WHERE ${req.user.id} = ANY (SELECT unnest(profiles) from public.documents) AND ${req.params.documentId} = id;`)
          .on(`row`, (row) => { song.push(row); })
          .on(`end`, () => {
            res.status(200).send();
            connection.done();
          });
        } else {
        // create the song
          connection.client.query(`INSERT INTO documents (contents, date, modified, profiles) VALUES ('${JSON.stringify(req.body)}', current_timestamp, current_timestamp, '{${req.user.id}}');`)
          .on(`row`, (row) => { song.push(row); })
          .on(`end`, () => {
            res.status(200).send();
            connection.done();
          });
        }
      });
    });
  });
}