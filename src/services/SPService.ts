import { ISPService, ILibsOptions, LibsOrderBy } from "./ISPService";
import { ISPLists } from "../common/SPEntities";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { ExtensionContext } from "@microsoft/sp-extension-base";
import { SPHttpClient, ISPHttpClientOptions } from "@microsoft/sp-http";

export default class SPService implements ISPService {

  private _webAbsoluteUrl: string;

  constructor(private _context: WebPartContext | ExtensionContext, webAbsoluteUrl?: string) {
    this._webAbsoluteUrl = webAbsoluteUrl ? webAbsoluteUrl : this._context.pageContext.web.absoluteUrl;
  }

  /**
   * Get lists or libraries
   *
   * @param options
   */
  public async getLibs(options?: ILibsOptions): Promise<ISPLists> {
    let filtered: boolean;
    let queryUrl: string = `${this._webAbsoluteUrl}/_api/web/lists?$select=Title,id,BaseTemplate`;

    if (options.orderBy) {
      queryUrl += `&$orderby=${options.orderBy === LibsOrderBy.Id ? 'Id' : 'Title'}`;
    }

    if (options.filter) {
      queryUrl += `&$filter=${encodeURIComponent(options.filter)}`;
    } else {
      if (options.baseTemplate) {
        queryUrl += `&$filter=BaseTemplate eq ${options.baseTemplate}`;
        filtered = true;
      }

      if (options.includeHidden === false) {
        queryUrl += filtered ? ' and Hidden eq false' : '&$filter=Hidden eq false';
        filtered = true;
      }
    }

    const data = await this._context.spHttpClient.get(queryUrl, SPHttpClient.configurations.v1);
    if (data.ok) {
      return await data.json() as Promise<ISPLists>;
    } else {
      return null;
    }
  }

  /**
   * Get List Items
   */
  public async getListItems(filterText: string, listId: string, internalColumnName: string, keyInternalColumnName?: string, webUrl?: string, filter?: string, substringSearch: boolean = false, orderBy?: string): Promise<any[]> {
    let returnItems: any[];
    const filterStr = substringSearch ? // JJ - 20200613 - find by substring as an option
      `substringof('${encodeURIComponent(filterText.replace("'", "''"))}',${internalColumnName})${filter ? ' and ' + filter : ''}`
      : `startswith(${internalColumnName},'${encodeURIComponent(filterText.replace("'", "''"))}')${filter ? ' and ' + filter : ''}`; //string = filterList  ? `and ${filterList}` : '';
    try {
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists('${listId}')/items?$select=${keyInternalColumnName || 'Id'},${internalColumnName}&$filter=${filterStr}&$orderby=${orderBy}`;
      const data = await this._context.spHttpClient.get(apiUrl, SPHttpClient.configurations.v1);
      if (data.ok) {
        const results = await data.json();
        if (results && results.value && results.value.length > 0) {
          return results.value;
        }
      }

      return [];
    } catch (error) {
      return Promise.reject(error);
    }
  }



  /**
* Gets list items for list item picker
* @param filterText
* @param listId
* @param internalColumnName
* @param [keyInternalColumnName]
* @param [webUrl]
* @param [filterList]
* @returns list items for list item picker
*/
  public async getListItemsForListItemPicker(
    filterText: string,
    listId: string,
    internalColumnName: string,
    keyInternalColumnName?: string,
    webUrl?: string,
    filterList?: string
  ): Promise<any[]> {
    let _filter: string = `$filter=startswith(${internalColumnName},'${encodeURIComponent(
      filterText.replace("'", "''")
    )}') `;
    let costumfilter: string = filterList
      ? `and ${filterList}`
      : "";
    let _top = " &$top=2000";

    // test wild character "*"  if "*" load first 30 items
    if (
      (filterText.trim().indexOf("*") == 0 &&
        filterText.trim().length == 1) ||
      filterText.trim().length == 0
    ) {
      _filter = "";
      costumfilter = filterList ? `$filter=${filterList}&` : "";
      _top = `$top=500`;
    }

    try {
      const webAbsoluteUrl = !webUrl
        ? this._webAbsoluteUrl
        : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists('${listId}')/items?$orderby=${internalColumnName}&$select=${keyInternalColumnName ||
        "Id"},${internalColumnName}&${_filter}${costumfilter}${_top}`;
      const data = await this._context.spHttpClient.get(
        apiUrl,
        SPHttpClient.configurations.v1
      );
      if (data.ok) {
        const results = await data.json();
        if (
          results &&
          results.value &&
          results.value.length > 0
        ) {
          return results.value;
        }
      }
      return [];
    } catch (error) {
      return Promise.reject(error);
    }
  }



  /**
   * Get list item attachments
   *
   * @param listId
   * @param itemId
   * @param webUrl
   */
  public async getListItemAttachments(listId: string, itemId: number, webUrl?: string): Promise<any[]> {
    try {
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists(@listId)/items(@itemId)/AttachmentFiles?@listId=guid'${encodeURIComponent(listId)}'&@itemId=${encodeURIComponent(String(itemId))}`;
      const data = await this._context.spHttpClient.get(apiUrl, SPHttpClient.configurations.v1);
      if (data.ok) {
        const results = await data.json();
        if (results && results.value) {
          return results.value;
        }
      }

      return null;
    } catch (error) {
      console.dir(error);
      return Promise.reject(error);
    }
  }

  /**
   * Delete attachment
   *
   * @param fileName
   * @param listId
   * @param itemId
   * @param webUrl
   */
  public async deleteAttachment(fileName: string, listId: string, itemId: number, webUrl?: string): Promise<void> {
    try {
      const spOpts: ISPHttpClientOptions = {
        headers: { "X-HTTP-Method": 'DELETE', }
      };
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists(@listId)/items(@itemId)/AttachmentFiles/getByFileName(@fileName)/RecycleObject?@listId=guid'${encodeURIComponent(listId)}'&@itemId=${encodeURIComponent(String(itemId))}&@fileName='${encodeURIComponent(fileName.replace(/'/g, "''"))}'`;
      const data = await this._context.spHttpClient.post(apiUrl, SPHttpClient.configurations.v1, spOpts);
    } catch (error) {
      console.dir(error);
      return Promise.reject(error);
    }
  }

  /**
   * Add attachment
   *
   * @param listId
   * @param itemId
   * @param fileName
   * @param file
   * @param webUrl
   */
  public async addAttachment(listId: string, itemId: number, fileName: string, file: File, webUrl?: string): Promise<void> {
    try {
      // Remove special characters in FileName
      fileName = fileName.replace(/[^\.\w\s\&\-]/gi, '');
      // Check if attachment exists
      const fileExists = await this.checkAttachmentExists(listId, itemId, fileName, webUrl);
      // Delete attachment if it exists
      if (fileExists) {
        await this.deleteAttachment(fileName, listId, itemId, webUrl);
      }
      // Add attachment
      const spOpts: ISPHttpClientOptions = {
        body: file
      };
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists(@listId)/items(@itemId)/AttachmentFiles/add(FileName=@fileName)?@listId=guid'${encodeURIComponent(listId)}'&@itemId=${encodeURIComponent(String(itemId))}&@fileName='${encodeURIComponent(fileName.replace(/'/g, "''"))}'`;
      const data = await this._context.spHttpClient.post(apiUrl, SPHttpClient.configurations.v1, spOpts);
      return;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Get attachement for list item
   *
   * @param listId
   * @param itemId
   * @param fileName
   * @param webUrl
   */
  public async getAttachment(listId: string, itemId: number, fileName: string, webUrl?: string): Promise<any> {
    const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
    const apiUrl = `${webAbsoluteUrl}/_api/web/lists(@listId)/items(@itemId)/AttachmentFiles/GetByFileBame(@fileName))?@listId=guid'${encodeURIComponent(listId)}'&@itemId=${encodeURIComponent(String(itemId))}&@fileName='${encodeURIComponent(fileName.replace(/'/g, "''"))}'`;
    const data = await this._context.spHttpClient.get(apiUrl, SPHttpClient.configurations.v1);
    if (data.ok) {
      const file = await data.json();
      if (file) {
        return file;
      }
    }

    return null;
  }

  /**
   * Check if the attachment exists
   *
   * @param listId
   * @param itemId
   * @param fileName
   * @param webUrl
   */
  public async checkAttachmentExists(listId: string, itemId: number, fileName: string, webUrl?: string): Promise<any> {
    try {
      const listServerRelativeUrl = await this.getListServerRelativeUrl(listId, webUrl);
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const fileServerRelativeUrl = `${listServerRelativeUrl}/Attachments/${itemId}/${fileName}`;
      const apiUrl = `${webAbsoluteUrl}/_api/web/getfilebyserverrelativeurl(@url)/Exists?@url='${encodeURIComponent(fileServerRelativeUrl.replace(/'/g, "''"))}'`;
      const data = await this._context.spHttpClient.get(apiUrl, SPHttpClient.configurations.v1);
      if (data.ok) {
        const results = await data.json();
        if (results) {
          return results.value;
        }
      }

      return false;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Get the list name
   *
   * @param listId
   * @param webUrl
   */
  public async getListName(listId: string, webUrl?: string): Promise<string> {
    const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
    const apiUrl = `${webAbsoluteUrl}/_api/web/lists(@listId)/RootFolder/Name?@listId=guid'${encodeURIComponent(listId)}'`;
    const data = await this._context.spHttpClient.get(apiUrl, SPHttpClient.configurations.v1);
    if (data.ok) {
      const results = await data.json();
      if (results) {
        return results.value;
      }
    }

    return;
  }

  /**
   * Get the list server relative url
   *
   * @param listId
   * @param webUrl
   */
  public async getListServerRelativeUrl(listId: string, webUrl?: string): Promise<string> {
    const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
    const apiUrl = `${webAbsoluteUrl}/_api/web/lists(@listId)/RootFolder/ServerRelativeUrl?@listId=guid'${encodeURIComponent(listId)}'`;
    const data = await this._context.spHttpClient.get(apiUrl, SPHttpClient.configurations.v1);
    if (data.ok) {
      const results = await data.json();
      if (results) {
        return results.value;
      }
    }

    return;
  }

  /**
   * Get List Item comments
   */
  public async getListItemComments(listId: string, itemId: number, webUrl?: string): Promise<any[]> {
    let returnItems: any[];
    try {
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists('${listId}')/items(${itemId})/GetComments()`;
      const data = await this._context.spHttpClient.get(apiUrl, SPHttpClient.configurations.v1);
      if (data.ok) {
        const results = await data.json();
        if (results && results.value && results.value.length > 0) {
          return results.value;
        }
      } else {
        const resultserror = await data.json();
        if (resultserror.error) {
          return Promise.reject(resultserror.error.message);
        }
      }
      return [];
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
  * Add List Item comments
  */
  public async addListItemComments(listId: string, itemId: number, bodyText: string, webUrl?: string): Promise<any[]> {
    let returnItems: any[];
    try {
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists('${listId}')/items(${itemId})/Comments()`;
      const spOpts: ISPHttpClientOptions = {
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ "text": bodyText })
      };
      const data = await this._context.spHttpClient.post(apiUrl,
        SPHttpClient.configurations.v1, spOpts);
      if (data.ok) {
        const results = await data.json();
        if (results) {
          return results;
        }
      } else {
        const resultserror = await data.json();
        if (resultserror.error) {
          return Promise.reject(resultserror.error.message);
        }
      }
      return [];
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
  * Like or unlike List Item comment
  */
  public async likeUnlikeListItemComments(listId: string, itemId: number, commentId: number,
    actionType: string, webUrl?: string): Promise<any[]> {
    let returnItems: any[];
    try {
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists('${listId}')/items(${itemId})/Comments(${commentId})/${actionType}`;
      const spOpts: ISPHttpClientOptions = {
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({})
      };
      const data = await this._context.spHttpClient.post(apiUrl,
        SPHttpClient.configurations.v1, spOpts);
      if (data.status == 204) {
        return [];
      } else {
        return Promise.reject("Error while updating comment");
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
 * Deleta List Item comment
 */
  public async deleteListItemComments(listId: string, itemId: number, commentId: number, webUrl?: string): Promise<any[]> {
    let returnItems: any[];
    try {
      const webAbsoluteUrl = !webUrl ? this._webAbsoluteUrl : webUrl;
      const apiUrl = `${webAbsoluteUrl}/_api/web/lists('${listId}')/items(${itemId})/Comments(${commentId})`;
      const spOpts: ISPHttpClientOptions = {
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "X-HTTP-Method": "DELETE",
          "IF-MATCH": "*"
        }
      };
      const data = await this._context.spHttpClient.post(apiUrl,
        SPHttpClient.configurations.v1, spOpts);
      if (data.status == 204) {
        return [];
      } else {
        return Promise.reject("Error while deleting comment");
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

}
