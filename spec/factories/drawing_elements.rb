FactoryBot.define do
  factory :drawing_element do
    association :drawing
    association :user
    element_type { "line" }
    data { {
      "start" => { "x" => 0, "y" => 0 },
      "end" => { "x" => 100, "y" => 100 }
    } }
  end
end
