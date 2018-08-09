import Humps from 'humps';
import LinkParser from 'parse-link-header';
import URLJoin from 'url-join';

function defaultRequest(
  { url },
  endpoint,
  {
    headers,
    body,
    formData,
    method,
  },
) {
  const params = {
    url: URLJoin(url, endpoint),
    method,
    headers,
    responseType: 'json',
  };

  if (body) params.params = Humps.decamelizeKeys(body);
  if (formData) params.formData = formData;

  return params;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPaginated(service, endpoint, options = {}, sleepOnRateLimit = true) {
  const { showPagination, maxPages, ...queryOptions } = options;
  const requestOptions = defaultRequest(service, endpoint, {
    method: 'get',
    headers: service.headers,
    body: queryOptions,
    resolveWithFullResponse: true,
  });

  try {
    const response = await service.requester(requestOptions);
    const links = LinkParser(response.headers.link) || {};
    const page = response.headers['x-page'];
    const underMaxPageLimit = maxPages ? page < maxPages : true;
    let more = [];
    let data;

    // If not looking for a singular page and still under the max pages limit
    // AND their is a next page, paginate
    if (!queryOptions.page && underMaxPageLimit && links.next) {
      more = await getPaginated(service, links.next.url.replace(service.url, ''), options);
      data = [...response.data, ...more];
    } else {
      data = response.data;
    }

    if (queryOptions.page && showPagination) {
      return {
        data,
        pagination: {
          total: response.headers['x-total'],
          next: response.headers['x-next-page'] || null,
          current: response.headers['x-page'] || null,
          previous: response.headers['x-prev-page'] || null,
          perPage: response.headers['x-per-page'],
          totalPages: response.headers['x-total-pages'],
        },
      };
    }

    return data;
  } catch (err) {
    const sleepTime = parseInt(err.response.headers['retry-after'], 10);
    if (sleepOnRateLimit && parseInt(err.statusCode, 10) === 429
         && sleepTime) {
      await wait(sleepTime * 1000);
      return getPaginated(service, endpoint, options, sleepOnRateLimit);
    }
    throw err;
  }
}

class RequestHelper {
  static async get(service, endpoint, options = {}) {
    return getPaginated(service, endpoint, options);
  }

  static post(service, endpoint, options = {}, form = false) {
    const body = form ? 'formData' : 'body';
    const requestOptions = defaultRequest(service, endpoint, {
      method: 'post',
      headers: service.headers,
      [body]: options,
    });

    return service.requester(requestOptions);
  }

  static put(service, endpoint, options = {}) {
    const requestOptions = defaultRequest(service, endpoint, {
      method: 'put',
      headers: service.headers,
      body: options,
    });

    return service.requester(requestOptions);
  }

  static delete(service, endpoint, options = {}) {
    const requestOptions = defaultRequest(service, endpoint, {
      method: 'delete',
      headers: service.headers,
      body: options,
    });

    return service.requester(requestOptions);
  }
}

export default RequestHelper;
