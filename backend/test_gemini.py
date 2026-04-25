from gemini import explain_with_gemini

test_proverb = {'proverb': 'Test proverb', 'meaning': 'Test meaning'}
result = explain_with_gemini('explain this', test_proverb)
print('Gemini API test result:', result)