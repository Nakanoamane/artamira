require 'rails_helper'

RSpec.describe 'Api::V1::Drawings', type: :request do
  include AuthenticationHelpers

  let!(:user) { create(:user) } # FactoryBotでテストユーザーを作成

  describe 'GET /api/v1/drawings' do
    context '認証済みユーザーの場合' do
      let!(:drawing1) { create(:drawing, user: user, title: '最初の描画ボード') }
      let!(:drawing2) { create(:drawing, user: user, title: '二番目の描画ボード') }
      let(:cookies) { sign_in(user) }

      it '描画ボードのリストを返す' do
        get api_v1_drawings_path, headers: { 'Cookie' => cookies.map { |k, v| "#{k}=#{v}" }.join(';') }, as: :json
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
      let(:cookies) { sign_in(user) }

      it '新しい描画ボードを作成し、201 Created を返す' do
        expect do
          post api_v1_drawings_path, params: valid_params, headers: { 'Cookie' => cookies.map { |k, v| "#{k}=#{v}" }.join(';') }, as: :json
        end.to change(Drawing, :count).by(1)
        expect(response).to have_http_status(:created)
        expect(response.parsed_body['title']).to eq('新しい描画ボード')
      end
    end

    context '認証済みユーザーと無効なパラメータの場合' do
      let(:invalid_params) { { drawing: { title: '', user_id: user.id } } } # タイトルが空
      let(:cookies) { sign_in(user) }

      it '422 Unprocessable Entity を返す' do
        expect do
          post api_v1_drawings_path, params: invalid_params, headers: { 'Cookie' => cookies.map { |k, v| "#{k}=#{v}" }.join(';') }, as: :json
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
      let(:cookies) { sign_in(user) }

      it '描画ボードの詳細を返す' do
        get api_v1_drawing_path(drawing), headers: { 'Cookie' => cookies.map { |k, v| "#{k}=#{v}" }.join(';') }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body['id']).to eq(drawing.id)
        expect(response.parsed_body['title']).to eq('テスト詳細ボード')
      end

      context '存在しない描画ボードの場合' do
        it '404 Not Found を返す' do
          get api_v1_drawing_path(99999), headers: { 'Cookie' => cookies.map { |k, v| "#{k}=#{v}" }.join(';') }, as: :json
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
end
