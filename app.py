from flask import Flask, request, jsonify, render_template, Response
from flask_cors import CORS
from zhipuai import ZhipuAI
import json
import time

app = Flask(__name__)
CORS(app)

# 初始化智谱AI客户端
client = ZhipuAI(api_key="填自己的")

@app.route('/')
def index():
    """主页面"""
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """处理聊天请求"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': '消息不能为空'}), 400
        
        # 调用智谱AI API
        response = client.chat.completions.create(
            model="glm-4.5",
            messages=[
                {"role": "user", "content": user_message}
            ],
            stream=False,
            max_tokens=4096,
            temperature=0.7
        )
        
        # 获取回复内容
        reply = response.choices[0].message.content
        
        return jsonify({
            'success': True,
            'reply': reply,
            'timestamp': time.time()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    """处理流式聊天请求"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': '消息不能为空'}), 400
        
        def generate():
            try:
                # 调用智谱AI流式API
                response = client.chat.completions.create(
                    model="glm-4.5",
                    messages=[
                        {"role": "user", "content": user_message}
                    ],
                    stream=True,
                    max_tokens=4096,
                    temperature=0.7
                )
                
                # 流式返回数据
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        yield f"data: {json.dumps({'content': content, 'done': False})}\n\n"
                
                # 发送结束信号
                yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
        
        return Response(generate(), 
                       mimetype='text/event-stream',
                       headers={
                           'Cache-Control': 'no-cache',
                           'Connection': 'keep-alive',
                           'Access-Control-Allow-Origin': '*',
                           'Access-Control-Allow-Headers': 'Content-Type'
                       })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)