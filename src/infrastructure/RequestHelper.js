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
    resolveWithFullResponse = false,
  },
) {
  const params = {
    url: URLJoin(url, endpoint),
    method,
    headers,
    responseType: 'json',
  };

  if (body) params.data = Humps.decamelizeKeys(body);
  if (formData) params.formData = formData;

  params.resolveWithFullResponse = resolveWithFullResponse;

  return params;
}

async function getPaginated(service, endpoint, options = {}) {
  const { showPagination, maxPages, ...queryOptions } = options;
  const requestOptions = defaultRequest(service, endpoint, {
    method: 'get',
    headers: service.headers,
    body: queryOptions,
    resolveWithFullResponse: true,
  });

  const response = await service.requester(requestOptions);
  const links = LinkParser(response.headers.link) || {};
  const page = response.headers['x-page'];
  const underMaxPageLimit = maxPages ? page < maxPages : true;
  let more = [];

  // If not looking for a singular page and still under the max pages limit
  // AND their is a next page, paginate
  if (!queryOptions.page && underMaxPageLimit && links.next) {
    more = await getPaginated(service, links.next.url.replace(service.url, ''), options);
  }

  const data = [...response.data, ...more];

  if (!queryOptions.page && showPagination) {
    return {
      data,
      pagination: {
        perPage: response.headers['x-per-page'],
        next: response.headers['x-next-page'],
        current: response.headers['x-page'],
        previous: response.headers['x-prev-page'],
        total: response.headers['x-total-pages'],
      },
    };
  }

  return data;
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
