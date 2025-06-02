require 'rails_helper'

RSpec.describe 'Api::V1::Drawings', type: :request do
  include AuthenticationHelpers

  let!(:user) { create(:user) }

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
    let!(:drawing) { create(:drawing, user: user, title: 'テスト詳細ボード') }

    context '認証済みユーザーの場合' do
      let!(:cookies) { cookies_for_header(user) }

      it '描画ボードの詳細を返す' do
        get api_v1_drawing_path(drawing), headers: { 'Cookie' => cookies }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body['id']).to eq(drawing.id)
        expect(response.parsed_body['title']).to eq('テスト詳細ボード')
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

      it '描画ボードのlast_saved_atを更新し、200 OKを返す' do
        # API呼び出し前のlast_saved_atを記録
        old_last_saved_at = drawing.last_saved_at
        travel 1.second # 1秒進めて更新を明確にする

        post save_api_v1_drawing_path(drawing), headers: { 'Cookie' => cookies }, as: :json

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body['status']).to eq('success')
        expect(response.parsed_body['message']).to eq('Drawing saved successfully.')

        # データベースのlast_saved_atが更新されていることを確認
        drawing.reload
        expect(drawing.last_saved_at).not_to be_nil
        expect(drawing.last_saved_at).not_to eq(old_last_saved_at)
        expect(response.parsed_body['last_saved_at']).to be_present
      end

      it '描画ボードが保存されたことをAction Cableでブロードキャストする' do
        expect do
          post save_api_v1_drawing_path(drawing), headers: { 'Cookie' => cookies }, as: :json
        end.to have_broadcasted_to("drawing_#{drawing.id}").from_channel(DrawingChannel).with { |data|
          data['type'] == 'drawing_saved' &&
          data['drawing_id'] == drawing.id &&
          Time.zone.parse(data['last_saved_at']).to_i == drawing.reload.last_saved_at.to_i
        }
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
end
