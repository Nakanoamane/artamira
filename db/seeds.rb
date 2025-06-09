# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# E2Eテスト用のテストユーザーを、存在しない場合にのみ作成します
if defined?(User)
  email = ENV.fetch('TEST_USER_EMAIL', 'test@example.com')
  password = ENV.fetch('TEST_USER_PASSWORD', 'password')

  unless User.exists?(email_address: email)
    begin
      User.create!(
        email_address: email,
        password: password,
        password_confirmation: password # Assuming confirmation is needed
      )
    rescue ActiveRecord::RecordInvalid => e
    rescue => e
    end
  end
end
