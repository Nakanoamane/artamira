FactoryBot.define do
  factory :drawing do
    sequence(:title) { |n| "Drawing #{n}" }
    association :user
  end
end
