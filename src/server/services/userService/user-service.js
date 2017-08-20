import mysql from 'mysql2';

import { UserDbHelper } from './model/userDto';

const Users = UserDbHelper();

export default class UserService {
  constructor(options) {
    this.options = options;
  }

  getUser = async userId => new Promise(async (resolve, reject) => {
    if (userId == null) {
      return resolve({ id: -1 });
    }

    try {
      const connection = await this.options.connectToMysqlDb(this.options.mysqlParameters);
      let user = {};
      let [rows] = await connection.query(`
          SELECT ${Users.columns('p', 'SELECT')} FROM profiles p
          WHERE p.id = :id;
        `, { id: userId });

      user = { ...rows[0] };

      [rows] = await connection.query(`
            SELECT * FROM profiles_instruments pi
              INNER JOIN instruments i
              ON i.id = pi.instrument_id
            WHERE pi.profile_id = :id;`, { id: userId });

      user.instruments = rows;

      [rows] = await connection.query(`
            SELECT * FROM preferences pr
            WHERE pr.profile_id = :id;`, { id: userId });

      user = { ...user, ...rows[0] };

      resolve(Users.userMapper(user));
    } catch (err) {
      reject(err);
    }
  })

  updateUser = async (userId, facebookId) => new Promise(async (resolve, reject) => {
    console.log(userId, facebookId);
    if (userId == null || facebookId == null) {
      return resolve(-1);
    }

    try {
      const connection = await this.options.connectToMysqlDb(this.options.mysqlParameters);

      await connection.query(`
          UPDATE users u
          SET facebook_id = :facebookId
          WHERE u.id = :userId;
        `, { userId, facebookId });

      connection.destroy();

      return resolve(userId);
    } catch (err) {
      return reject(err);
    }
  });

  getUserByFacebookId = async facebookId => new Promise(async (resolve, reject) => {
    if (facebookId == null) {
      return resolve({ id: -1 });
    }
    try {
      const connection = await this.options.connectToMysqlDb(this.options.mysqlParameters);
      let user = {};
      const [rows] = await connection.query(`
          SELECT * FROM users u
          WHERE u.facebook_id = :facebookId;
        `, { facebookId });

      user = { ...rows[0] };

      if (user == null) {
        return resolve({ id: -1 });
      }

      resolve(this.getUser(user.id));
    } catch (err) {
      reject(err);
    }
  })

  getUsers = async (userIds, callback) => (
    new Promise(async (resolve, reject) => {
      if (userIds == null || userIds.length === 0) {
        resolve({ id: -1 });
        return;
      }

      const users = userIds.map(async id => (await this.getUser(id)));

      if (users.length === 0) {
        resolve({ id: -1 });
        return;
      }

      resolve(users);
    })
  );

  updateProfile = async (profile, id) => new Promise(async (resolve, reject) => {
    try {
      const connection = await this.options.connectToMysqlDb(this.options.mysqlParameters);
      await connection.beginTransaction(err => reject(err));

      await connection.execute(`
          UPDATE profiles
          SET location = :location,
            bio = :bio,
            cover_url = :coverUrl,
            first_name = :firstName,
            last_name = :lastName,
            avatar_url = :avatarUrl,
            zip_code = :zipCode,
            profession = :profession
          WHERE id = :id;`,
        { location: profile.location || null,
          bio: profile.bio || null,
          coverUrl: profile.coverImage || null,
          firstName: profile.firstName || null,
          lastName: profile.lastName || null,
          avatarUrl: profile.avatarUrl || null,
          zipCode: profile.zipCode || null,
          profession: profile.profession || null,
          id,
        });

      const [rows] = await connection.query(`
          SELECT pi.instrument_id
          FROM profiles_instruments pi
          WHERE pi.profile_id = :id;`,
          { id });

      const instrumentSets = profile.instruments.reduce((obj, instrumentId) => {
        if (!rows.includes(instrumentId)) {
          obj.newInstrumentIds.push(instrumentId);
        }
        return obj;
      }, { newInstrumentIds: [], instrumentIdsToRemove: [] });

      rows.reduce((obj, instrumentId) => {
        if (!profile.instruments.includes(instrumentId)) {
          obj.instrumentIdsToRemove.push(instrumentId);
        }
        return obj;
      }, instrumentSets);

      for (const instrumentId of instrumentSets.newInstrumentIds) {
        await connection.execute(`
            INSERT INTO profiles_instruments (instrument_id, profile_id) VALUES (:instrumentId, :profileId)`,
            { instrumentId, profileId: id });
      }

      for (const instrumentId of instrumentSets.instrumentIdsToRemove) {
        await connection.execute(`
            DELETE FROM profiles_instruments WHERE instrument_id = :instrumentId AND profile_id = :profileId;`,
            { instrumentId, profileId: id });
      }

      await connection.execute(`
          UPDATE preferences SET is_looking = :isLooking, display_location = :displayLocation
          WHERE profile_id = :id;`,
          { isLooking: profile.preferences.isLooking ? 1 : 0, displayLocation: profile.preferences.displayLocation ? 1 : 0, id });

      await connection.execute(`
          INSERT INTO preferences (is_looking, display_location, profile_id) SELECT :isLooking, :displayLocation, :id
            WHERE NOT EXISTS (SELECT * FROM preferences WHERE profile_id = :id);`,
          { isLooking: profile.preferences.isLooking ? 1 : 0, displayLocation: profile.preferences.displayLocation ? 1 : 0, id });

      await connection.commit();
      resolve();
    } catch (err) {
      reject(err);
    }
  })

  registerUser = async (email, password, firstName, lastName, facebookId) => new Promise(async (resolve, reject) => {
    if (!email && !facebookId) {
      reject('Must have either an email or facebook id to register user');
    }
    if (!facebookId && !password) {
      reject('If not using facebook login, must include a password');
    }

    const connection = await this.options.connectToMysqlDb(this.options.mysqlParameters);
    await connection.beginTransaction((err) => {
      if (err) {
        reject(err);
      }
    });

    let userId;
    try {
      const [rows, fields] = await connection.query(
          'INSERT INTO users (email, password, facebook_id) VALUES(:email, :password, :facebookId);',
          { email: email || null, password: password || null, facebookId: facebookId || '' },
        );
      userId = rows.insertId;
    } catch (err) {
      reject(err);
    }

    let profileId;
    try {
      const [rows] = await connection.execute(
          'INSERT INTO profiles (email, user_id, first_name, last_name) VALUES (:email, :userId, :firstName, :lastName);',
          { email: email || null, userId, firstName, lastName },
        );
      profileId = rows.insertId;
    } catch (err) {
      reject(err);
    }
    try {
      await connection.commit();
    } catch (err) {
      connection.rollback();
      reject(err);
    }
    resolve(profileId);
  })
}
