import URLJoin from 'url-join';
import Axios from 'axios';

class BaseModel {
  constructor({
    token,
    oauthToken,
    url = 'https://gitlab.com',
    version = 'v4',
  } = {}) {
    this.url = URLJoin(url, 'api', version);
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
