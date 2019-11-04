const devtools = chrome.devtools;
let xhrList = [];
let filter = false
let count = 0

// 去除重复数据
$('.filterBtn').click(function () {
  filter = !filter
  $('.filterBtn').text(filter ? '已去重' : '未去重')
})

// 清除数据
$('.clearBtn').click(function () {
  $('.list').html('')
  $('.number').text(0)
  xhrList = []
})

// 删除单个接口
$(document).on('click', '.deleteBtn', function () {
  $(`#item-${this.name}`).remove();
  xhrList.splice(this.name, 1)
  $('.number').text(xhrList.length)
})

// 下载数据
$('.downloadBtn').click(function () {

  if (xhrList.length === 0) {
    alert('无数据可下载')
    return;
  }
  xhrList.map(item => {
    item.title = $(`input[name=title-${item.id}]`).val();
    item.remark = $(`textarea[name=remark-${item.id}]`).val();
    return item;
  })
  let markdown= []
  xhrList.forEach(item => {
    markdown = [...markdown, ...[
      { h2: item.title },
      { h5: '备注' },
      { ul: [item.remark] },
      { h5: '接口请求url' },
      { ul: [ '```' + item.url + '```'] },
      { h5: '请求方式' },
      { ul: [ '```' + item.method + '```'] },
      { h5: '参数' },
      {
        table: {
          headers: ['参数名', '说明', '数据', '类型', '必填'],
          rows: item.params.map(i => [i.name, '', i.value, is(i.value), ''])
        }
      },
      {
        code: {
          language: 'json',
          content: item.paramsFormat
        }
      },
      { h5: '返回示例' },
      {
        code: {
          language: 'json',
          content: item.body
        }
      },
    ]]
  })
  const current = currentTime()
  let fileName = prompt('请输入所要下载的文件名称', current)
  if (fileName == null) {
    fileName = current
  }
  const aLink = document.createElement('a')
  const blob = new Blob([json2md(markdown)])
  const evt = document.createEvent('MouseEvents')
  evt.initEvent('click', false, false)
  aLink.download = `${fileName}.md`
  aLink.href = URL.createObjectURL(blob)
  aLink.dispatchEvent(evt)
})

function currentTime() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1) === 13 ? 12 : currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const hour = currentDate.getHours();
  const minute = currentDate.getMinutes();
  const second = currentDate.getSeconds();
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

// log
const log = (...params) => devtools.inspectedWindow.eval(`console.log(...${JSON.stringify(params)})`);

devtools.network.onRequestFinished.addListener(req => {
  const {request} = req;
  if (req._resourceType === 'xhr' && request.method !== 'OPTIONS') {
    req.getContent((body) => {
      count += 1;
      const url = request.url.split('?')[0]
      if (filter && xhrList.find(xhr => xhr.url === url)) {
        return;
      }
      // 获取参数
      let params = [];
      let paramsFormat = {};
      if (request.method === 'GET') {
        params = request.queryString
        if (params.length > 0) {
          params.forEach(i => paramsFormat = Object.assign(paramsFormat, {[i.name]: i.value}))
        }
        paramsFormat = JSON.stringify(paramsFormat)
      } else {
        if (request.postData) {
          paramsFormat = request.postData.text || {};
          let postObj = {}
          try {
            postObj = JSON.parse(paramsFormat)
            if (_.isEmpty(postObj)) {
              Object.entries(postObj).forEach(([k, v])=> {
                params = [...params, {name: k, value: v}]
              });
            }
          } catch (e) {
            params = []
            log('解析错误: ', e)
          }
        }
      }
      // 接口列表
      xhrList = [...xhrList, new Xhr(count, url, request.method, params, paramsFormat, body)]
      // 接口数量赋值
      $('.number').text(xhrList.length)
      // 接口方法赋值样式
      const method = request.method === 'GET' ? 'get-style' : 'post-style';
      // 接口参数表格
      let paramsTable = '';
      params.forEach(item => {
        paramsTable += `<tr>
          <td>${item.name}</td>
          <td></td>
          <td>${item.value}</td>
          <td>${is(item.value)}</td>
          <td></td>
        </tr>`
      })

      // 列表添加
      $('.list').append(`
        <div class="item" id="item-${count}">
<!--          <button class="deleteBtn" name="${count}">x</button>-->
          <div class="row">
            <h3>${xhrList.length}. 接口名称</h3>
            <p><input type="text" name="title-${count}" value="这是接口名称"/></p>
          </div>
          <div class="row">
            <h3>备注</h3>
            <p>
              <textarea name="remark-${count}" id="" cols="60" rows="1">这是接口备注</textarea>
            </p>
          </div>
          <div class="row">
            <h3>请求接口url</h3>
            <li><p>${url}</p></li>
          </div>
          <div class="row">
            <h3>请求方式</h3>
            <li>
              <p class="${method}">${request.method}</p>
            </li>
          </div>
          <div class="row">
            <h3>参数</h3>
            <table>
              <tr>
                <th>参数名</th>
                <th>说明</th>
                <th>数据</th>
                <th>类型</th>
                <th>必填</th>
              </tr>
              ${paramsTable}
            </table>
            <textarea name="" id="" cols="60" rows="5">${paramsFormat}</textarea>
          </div>
          <div class="row">
            <h3>返回示例</h3>
            <textarea name="" id="" cols="60" rows="5">${body}</textarea>
          </div>
        </div>
      `)
      $('.list').scrollTop($('.list').prop('scrollHeight'))
    });
  }
});

// 判断数据类型
function is(value) {
  const types = [
    { type: 'String', fn: _.isString },
    { type: 'Number', fn: _.isNumber },
    { type: 'Boolean', fn: _.isBoolean },
    { type: 'Array', fn: _.isArray },
    { type: 'Date', fn: _.isDate },
    { type: 'Null', fn: _.isNull },
  ]
  let type = null;

  types.forEach(item => {
    if (item.fn(value)) {
      type = item.type;
    }
  })
  return type;
}

// 接口对象
class Xhr {
  constructor(id, url, method, params, paramsFormat, body, title = '', remark = '') {
    this.id = id;
    this.url = url;
    this.method = method;
    this.params = params;
    this.paramsFormat = paramsFormat;
    this.body = body;
    this.title = title;
    this.remark = remark;
  }
}
