import URLJoin from 'url-join';
import Axios from 'axios';

class BaseModel {
  constructor({
    url = 'https://gitlab.com', token, oauthToken,
  } = {}) {
    this.url = URLJoin(url, 'api', 'v4');
    this.headers = {};
    this.requester = Axios;

    if (oauthToken) {
      this.headers.authorization = `Bearer ${oauthToken}`;
    } else if (token) {
      this.headers['private-token'] = token;
    } else {
      throw new Error('`token` (private-token) or `oauth_token` is mandatory');
    }
  }
}

export default BaseModel;
