require 'rails_helper'

RSpec.describe 'Api::V1::Drawings', type: :request do
  include AuthenticationHelpers

  let!(:user) { create(:user) }

  # ダミーのBase64エンコードされた画像データを生成するヘルパーメソッド
  def generate_dummy_base64_image(format)
    # 実際の画像データではないが、Base64として有効な短い文字列
    # 例: 1x1ピクセルの透明PNGのBase64データ
    case format
    when 'png'
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    when 'jpeg'
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQEBAQIBAQECAgICAgEwQCAgIBgWEBAQEBAgEBBAQEBQMDAwYHBgUEBAUDAwMD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAC//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAkQA/8QAFAABAAAAAAAAAAAAAAAAAAAAC//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAwQA/8QAFAABAAAAAAAAAAAAAAAAAAAAC//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQQI/8QAFAABAAAAAAAAAAAAAAAAAAAAC//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAiQA/8QAFAABAAAAAAAAAAAAAAAAAAAAC//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAoQA/8QAFAABAAAAAAAAAAAAAAAAAAAAC//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAxQA/8QAFCABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AwwwA/9k="
    else
      nil
    end
  end

  describe 'GET /api/v1/drawings' do
    context '認証済みユーザーの場合' do
      let!(:drawing1) { create(:drawing, user: user, title: '最初の描画ボード') }
      let!(:drawing2) { create(:drawing, user: user, title: '二番目の描画ボード') }
      let!(:cookies) { cookies_for_header(user) }

      it '描画ボードのリストを返す' do
        get api_v1_drawings_path, headers: { 'Cookie' => cookies }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body.length).to eq(2)
        expect(response.parsed_body[0]['title']).to eq('最初の描画ボード')
        expect(response.parsed_body[1]['title']).to eq('二番目の描画ボード')
      end
    end

    context '未認証ユーザーの場合' do
      it '401 Unauthorized を返す' do
        get api_v1_drawings_path, as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'POST /api/v1/drawings' do
    context '認証済みユーザーと有効なパラメータの場合' do
      let(:valid_params) { { drawing: { title: '新しい描画ボード', user_id: user.id } } }
      let!(:cookies) { cookies_for_header(user) }

      it '新しい描画ボードを作成し、201 Created を返す' do
        expect do
          post api_v1_drawings_path, params: valid_params, headers: { 'Cookie' => cookies }, as: :json
        end.to change(Drawing, :count).by(1)
        expect(response).to have_http_status(:created)
        expect(response.parsed_body['title']).to eq('新しい描画ボード')
      end
    end

    context '認証済みユーザーと無効なパラメータの場合' do
      let(:invalid_params) { { drawing: { title: '', user_id: user.id } } } # タイトルが空
      let!(:cookies) { cookies_for_header(user) }

      it '422 Unprocessable Entity を返す' do
        expect do
          post api_v1_drawings_path, params: invalid_params, headers: { 'Cookie' => cookies }, as: :json
        end.not_to change(Drawing, :count)
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body).to have_key('title')
        expect(response.parsed_body['title']).to include("can't be blank")
      end
    end

    context '未認証ユーザーの場合' do
      let(:valid_params) { { drawing: { title: 'テストボード', user_id: user.id } } }

      it '401 Unauthorized を返す' do
        post api_v1_drawings_path, params: valid_params, as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'GET /api/v1/drawings/:id' do
    let!(:drawing) { create(:drawing, user: user, title: 'テスト詳細ボード', canvas_data: '初期キャンバスデータ', last_saved_at: Time.current) }

    context '認証済みユーザーの場合' do
      let!(:cookies) { cookies_for_header(user) }

      it '描画ボードの詳細とcanvas_data, last_saved_atを返す' do
        get api_v1_drawing_path(drawing), headers: { 'Cookie' => cookies }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body['id']).to eq(drawing.id)
        expect(response.parsed_body['title']).to eq(drawing.title)
        expect(response.parsed_body['canvas_data']).to eq(drawing.canvas_data)
        expect(Time.zone.parse(response.parsed_body['last_saved_at']).to_i).to eq(drawing.last_saved_at.to_i)
      end

      context '存在しない描画ボードの場合' do
        it '404 Not Found を返す' do
          get api_v1_drawing_path(99999), headers: { 'Cookie' => cookies }, as: :json
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context '未認証ユーザーの場合' do
      it '401 Unauthorized を返す' do
        get api_v1_drawing_path(drawing), as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'POST /api/v1/drawings/:id/save' do
    let!(:drawing) { create(:drawing, user: user) }

    context '認証済みユーザーの場合' do
      let!(:cookies) { cookies_for_header(user) }

      it '描画ボードのlast_saved_atとcanvas_dataを更新し、200 OKを返す' do
        old_last_saved_at = drawing.last_saved_at
        old_canvas_data = drawing.canvas_data
        new_canvas_data = '新しいキャンバスデータ'
        travel 1.second

        post save_api_v1_drawing_path(drawing), params: { canvas_data: new_canvas_data }, headers: { 'Cookie' => cookies }, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body['status']).to eq('success')
        expect(response.parsed_body['message']).to eq('Drawing saved successfully.')

        drawing.reload
        expect(drawing.last_saved_at).not_to be_nil
        expect(drawing.last_saved_at).not_to eq(old_last_saved_at)
        expect(drawing.canvas_data).to eq(new_canvas_data)
        expect(response.parsed_body['last_saved_at']).to be_present
      end

      it '描画ボードが保存されたことをAction Cableでブロードキャストする' do
        new_canvas_data = 'ブロードキャスト用のキャンバスデータ'
        expect do
          post save_api_v1_drawing_path(drawing), params: { canvas_data: new_canvas_data }, headers: { 'Cookie' => cookies }, as: :json
        end.to have_broadcasted_to("drawing_#{drawing.id}").from_channel(DrawingChannel).with { |data|
          data['type'] == 'drawing_saved' &&
          data['drawing_id'] == drawing.id &&
          Time.zone.parse(data['last_saved_at']).to_i == drawing.reload.last_saved_at.to_i
        }
      end

      it 'CleanupDrawingElementsJobがエンキューされる' do
        new_canvas_data = 'ジョブエンキュー用のキャンバスデータ'
        expect do
          post save_api_v1_drawing_path(drawing), params: { canvas_data: new_canvas_data }, headers: { 'Cookie' => cookies }, as: :json
        end.to have_enqueued_job(CleanupDrawingElementsJob).with(drawing.id, kind_of(Time))
      end

      context '存在しない描画ボードの場合' do
        it '404 Not Found を返す' do
          post save_api_v1_drawing_path(99999), headers: { 'Cookie' => cookies }, as: :json
          expect(response).to have_http_status(:not_found)
        end
      end

      context '他のユーザーの描画ボードの場合' do
        let!(:other_user) { create(:user) }
        let!(:other_drawing) { create(:drawing, user: other_user) }

        it '404 Not Found を返す (認可エラーのため)' do
          post save_api_v1_drawing_path(other_drawing), headers: { 'Cookie' => cookies }, as: :json
          expect(response).to have_http_status(:not_found) # set_drawingでNotFoundになる
        end
      end
    end

    context '未認証ユーザーの場合' do
      it '401 Unauthorized を返す' do
        post save_api_v1_drawing_path(drawing), as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'GET /api/v1/drawings/:drawing_id/elements' do
    let!(:drawing) { create(:drawing, user: user, last_saved_at: 2.days.ago) }
    let!(:drawing_element1) { create(:drawing_element, drawing: drawing, user: user, element_type: 'line', data: { path: [[0,0],[10,10]] }) }
    let!(:drawing_element2) { create(:drawing_element, drawing: drawing, user: user, element_type: 'rectangle', data: { start: {x: 20, y: 20}, end: {x: 30, y: 30} }) }

    context '認証済みユーザーの場合' do
      let!(:cookies) { cookies_for_header(user) }

      it '描画要素とlast_saved_atを返す' do
        get api_v1_drawing_elements_path(drawing), headers: { 'Cookie' => cookies }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body).to have_key('drawing_elements')
        expect(response.parsed_body['drawing_elements'].length).to eq(2)
        expect(response.parsed_body).to have_key('last_saved_at')
        expect(Time.zone.parse(response.parsed_body['last_saved_at']).to_i).to eq(drawing.last_saved_at.to_i)
        expect(response.parsed_body['drawing_elements'][0]['element_type']).to eq('line')
        expect(response.parsed_body['drawing_elements'][1]['element_type']).to eq('rectangle')
      end

      context '存在しない描画ボードの場合' do
        it '404 Not Found を返す' do
          get api_v1_drawing_elements_path(99999), headers: { 'Cookie' => cookies }, as: :json
          expect(response).to have_http_status(:not_found)
        end
      end

      context '他のユーザーの描画ボードの場合' do
        let!(:other_user) { create(:user) }
        let!(:other_drawing) { create(:drawing, user: other_user) }
        it '404 Not Found を返す (認可エラーのため)' do
          get api_v1_drawing_elements_path(other_drawing), headers: { 'Cookie' => cookies }, as: :json
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context '未認証ユーザーの場合' do
      it '401 Unauthorized を返す' do
        get api_v1_drawing_elements_path(drawing), as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'POST /api/v1/drawings/:id/export' do
    let!(:drawing) { create(:drawing, user: user, title: 'テスト描画ボード') }

    context '認証済みユーザーで有効なパラメータの場合' do
      let!(:cookies) { cookies_for_header(user) }

      it 'PNG形式で描画ボードをエクスポートし、200 OKを返す' do
        image_data = generate_dummy_base64_image('png')
        post export_api_v1_drawing_path(drawing), params: { format: 'png', image_data: image_data }, headers: { 'Cookie' => cookies }

        expect(response).to have_http_status(:ok)
        expect(response.headers['Content-Type']).to eq('image/png')
        expect(response.headers['Content-Disposition']).to include("filename*=UTF-8''%E3%83%86%E3%82%B9%E3%83%88%E6%8F%8F%E7%94%BB%E3%83%9C%E3%83%BC%E3%83%89.png")
        expect(response.body).to be_present
      end

      it 'JPEG形式で描画ボードをエクスポートし、200 OKを返す' do
        image_data = generate_dummy_base64_image('jpeg')
        post export_api_v1_drawing_path(drawing), params: { format: 'jpeg', image_data: image_data }, headers: { 'Cookie' => cookies }

        expect(response).to have_http_status(:ok)
        expect(response.headers['Content-Type']).to eq('image/jpeg')
        expect(response.headers['Content-Disposition']).to include("filename*=UTF-8''%E3%83%86%E3%82%B9%E3%83%88%E6%8F%8F%E7%94%BB%E3%83%9C%E3%83%BC%E3%83%89.jpeg")
        expect(response.body).to be_present
      end
    end

    context '認証済みユーザーで無効なパラメータの場合' do
      let!(:cookies) { cookies_for_header(user) }

      it '無効なフォーマットの場合、400 Bad Requestを返す' do
        image_data = generate_dummy_base64_image('png')
        post export_api_v1_drawing_path(drawing), params: { format: 'gif', image_data: image_data }, headers: { 'Cookie' => cookies }

        expect(response).to have_http_status(:bad_request)
        expect(response.parsed_body['error']).to eq('Invalid format or missing image_data.')
      end

      it 'image_dataが不正な形式の場合、400 Bad Requestを返す' do
        post export_api_v1_drawing_path(drawing), params: { format: 'png', image_data: 'data:image/png;base64,invalid-base64-string' }, headers: { 'Cookie' => cookies }

        expect(response).to have_http_status(:bad_request)
        expect(response.parsed_body['error']).to eq('Invalid Base64 characters in image data.')
      end

      it 'image_dataが欠落している場合、400 Bad Requestを返す' do
        post export_api_v1_drawing_path(drawing), params: { format: 'png' }, headers: { 'Cookie' => cookies }

        expect(response).to have_http_status(:bad_request)
        expect(response.parsed_body['error']).to eq('Invalid format or missing image_data.')
      end

      it '存在しない描画ボードIDの場合、404 Not Foundを返す' do
        image_data = generate_dummy_base64_image('png')
        post export_api_v1_drawing_path(99999), params: { format: 'png', image_data: image_data }, headers: { 'Cookie' => cookies }

        expect(response).to have_http_status(:not_found)
      end

      context '他のユーザーの描画ボードの場合' do
        let!(:other_user) { create(:user) }
        let!(:other_drawing) { create(:drawing, user: other_user) }

        it '404 Not Foundを返す (認可エラーのため)' do
          image_data = generate_dummy_base64_image('png')
          post export_api_v1_drawing_path(other_drawing), params: { format: 'png', image_data: image_data }, headers: { 'Cookie' => cookies }

          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context '未認証ユーザーの場合' do
      it '401 Unauthorizedを返す' do
        image_data = generate_dummy_base64_image('png')
        post export_api_v1_drawing_path(drawing), params: { format: 'png', image_data: image_data }

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
