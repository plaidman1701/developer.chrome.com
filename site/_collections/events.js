/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const authorsData = require('../_data/authorsData.json');
const {i18n} = require('../_filters/i18n');
const {Img} = require('../_shortcodes/Img');
const {defaultAvatarImg, chromeImg} = require('../_data/site.json');
const {isPastEvent, sortAsc, sortDesc} = require('../_js/utils/events');

const EVENT_PLACEHOLDER =
  'image/fuiz5I8Iv7bV8YbrK2PKiY3Vask2/5nwgD8ftJ8DREfN1QF7z.png';

/**
 * @returns {EventsCollectionItem[]}
 */
const getEvents = ({collections, filter, sort, locale = 'en'}) => {
  let payload = collections.getFilteredByGlob(
    `./site/${locale}/meet-the-team/events/**/*.md`
  );

  if (filter) {
    payload = payload.filter(filter);
  }

  payload = payload.map(event => {
    const sessions = event.data.sessions.map(session =>
      processSession(session, locale)
    );

    const image = Img({
      src: event.data.image ?? EVENT_PLACEHOLDER,
      width: 400,
      height: 400,
      alt: event.data.title,
    });

    return {
      id: event.data.id,
      title: event.data.title,
      externalUrl: event.data.externalUrl,
      summary: event.data.summary,
      location: event.data.location,
      date: event.data.date,
      isPastEvent: isPastEvent(event),
      sessions,
      image,
    };
  });

  if (sort) {
    return payload.sort(sort);
  }

  return payload;
};

/**
 * @param {EleventyCollectionObject} collections
 * @returns {EventsCollectionItem[]}
 */
const pastEvents = collections => {
  return getEvents({
    collections,
    filter: event => isPastEvent(event),
    sort: sortDesc,
  });
};

/**
 * @param {EleventyCollectionObject} collections
 * @returns {EventsCollectionItem[]}
 */
const currentEvents = collections => {
  return getEvents({
    collections,
    filter: event => isPastEvent(event) === false,
    sort: sortAsc,
  });
};

/**
 * @param {EleventyCollectionObject} collections
 * @returns {{locations:string[], speakers:{}[], topics:string[]}}
 */
const eventTags = collections => {
  const events = getEvents({
    collections,
    filter: null,
    sort: null,
  });

  return {
    locations: uniqueLocations(events),
    speakers: uniqueSpeakers(events),
    topics: uniqueTopics(events),
  };
};

/**
 * @param {string} authorHandle
 * @param {string} locale
 * @returns {EventPersonCollectionItem}
 */
const getAuthorData = (authorHandle, locale) => {
  if (typeof authorsData[authorHandle] === 'undefined') {
    throw new Error(`Invalid author: ${authorHandle}`);
  }

  const authorData = authorsData[authorHandle];

  return {
    image: authorData.image ?? defaultAvatarImg,
    title: i18n(`i18n.authors.${authorHandle}.title`, locale),
    twitter: authorData.twitter,
    linkedin: authorData.linkedin,
    handle: authorHandle,
  };
};

/**
 * @param session
 * @param {String} locale
 * @returns {EventSessionCollectionItem}
 */
const processSession = (session, locale) => {
  const payload = {
    title: session.title,
    description: session.description,
    type: session.type,
    topics: session.topics,
    slidesUrl: session.slidesUrl,
    videoUrl: session.videoUrl,
  };

  if (session.type === 'speaker') {
    payload.speaker = getAuthorData(session.speaker, locale);
    payload.image = Img({
      src: payload.speaker.image,
      width: 40,
      height: 40,
      alt: payload.speaker.title ?? payload.title,
      class: 'flex-shrink-none height-600 width-600 rounded-full gap-right-300',
    });

    return payload;
  }

  payload.participants = session.participants.map(p => {
    return getAuthorData(p, locale);
  });

  payload.title =
    payload.participants.length === 1
      ? payload.participants[0].title
      : i18n('i18n.events.multiple_participants');

  payload.image = Img({
    src:
      payload.participants.length === 1
        ? payload.participants[0].image
        : chromeImg,
    width: 40,
    height: 40,
    alt: payload.title,
    class: 'flex-shrink-none height-600 width-600 rounded-full gap-right-300',
  });

  return payload;
};

/**
 * @param {EventsCollectionItem[]} events
 * @returns {{}[]}
 */
const uniqueSpeakers = events => {
  const rawSpeakers = events
    .map(e =>
      e.sessions.flatMap(s => {
        if (s.speaker) {
          return {handle: s.speaker.handle, title: s.speaker.title};
        }

        return s.participants.map(p => ({handle: p.handle, title: p.title}));
      })
    )
    .flat();

  return rawSpeakers
    .filter(
      (s, i) => rawSpeakers.findIndex(first => s.handle === first.handle) === i
    )
    .sort((a, b) => a.title.localeCompare(b.title));
};

/**
 * @param {EventsCollectionItem[]} events
 * @returns {string[]}
 */
const uniqueTopics = events => {
  const topics = events.map(e => e.sessions.flatMap(s => s.topics)).flat();

  return [...new Set(topics)].sort((a, b) => a.localeCompare(b));
};

/**
 * @param {EventsCollectionItem[]} events
 * @returns {string[]}
 */
const uniqueLocations = events => {
  const locations = events.map(e => e.location);

  return [...new Set(locations)].sort((a, b) => a.localeCompare(b));
};

module.exports = {currentEvents, pastEvents, eventTags};
