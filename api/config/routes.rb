Rails.application.routes.draw do
  # resource :session # 最上位レベルから削除
  # resources :passwords, param: :token # 最上位レベルから削除
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"

  namespace :api do
    namespace :v1 do
      # 認証関連のルートをRailsのRESTfulルーティングに置き換え
      post 'register', to: 'users#create' # 新規ユーザー登録ルートを追加
      post 'login', to: 'sessions#create' # ログインルートを追加
      delete 'logout', to: 'sessions#destroy' # ログアウトルートを追加
      resource :session, only: [:create, :destroy], path: '', as: :auth # ログイン・ログアウト
      resources :users, only: [:create] # ユーザー登録 (これはAPIの標準的なusers#createなので残しておく)
      resource :me, controller: 'users', only: [:show] # 現在のユーザー情報
      resources :passwords, param: :token, only: [:create, :update] # パスワードリセット関連

      resources :drawings do
        post 'save', on: :member
        post 'export', on: :member
      end
    end
  end
end
