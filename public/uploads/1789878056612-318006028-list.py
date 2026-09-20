# list = ["mango", "apple", "banana"]
# for i in list:
#     print(i)

# list_1 = [1,2,3,4,5]
# print(list_1[0])
# print(list_1[2])
# print(list_1[4])

# names = ["Rani", "Aman", "Priya", "Rahul"]
# print(names[2])

# colors = ["Red", "Blue", "Green"]
# colors[1] = "yellow"
# print(colors)

# numbers = [5, 10, 15, 20, 25]
# for i in range(len(numbers)):
#     print(numbers[i])
# for num in numbers:
#     print(num)

# numbers = [12, 7, 20, 5]
# for i in numbers:
#     if i > 10:
#         print(i)

# marks = [45, 67, 88, 39, 92]
# for i in marks:
#     if i > 50:
#         print(i)

# numbers = [12, 4, 19, 7, 25]
# for i in numbers:
#     if i >10:
#         print(i)

# numbers = [8, 15, 3, 22, 9]
# for i in numbers:
#     if i % 2==0:
#         print(i)

# numbers = [5, 9, 2, 18, 1]
# for i in numbers:
#     if i < 5:
#         print(i)

# numbers = [8, 2, 15, 6]

# largest = numbers[0]

# for num in numbers:
#     if num > largest:
#         largest = num
#     # Write your if condition here
# print(largest)

# numbers = [15, 3, 22, 8, 11]
# for num in numbers:
#     if num > 10:
#         print(num)

# numbers = [9, 2, 17, 4, 6]
# for num in numbers:
#     if num < 10:
#         print(num)

# numbers = [10, 15, 20, 25, 30]
# for num in numbers:
#     if num % 2 == 0:
#         print(num)

# numbers = [7, 8, 9, 10, 11]
# for num in numbers:
#     if num % 2 != 0:
#         print(num)

# numbers = [5, 8, 12, 8, 15]
# for num in numbers:
#     if num == 8:
#         print(num)

# numbers = [12, 5, 18, 3, 9]
# small = numbers[0]
# for i in numbers:
#     if small > i:
#         small = i
# print(small)

# numbers = [4, 3, 2, 1, 8]
# sum = 0
# for num in numbers:
#     sum = sum+ num
# print(sum)

# numbers = [10, 20, 30, 40, 50]
# sum = 0
# # les = len(numbers)
# for num in numbers:

#     sum += num
#     average = sum /len(numbers)
# print(average)

# numbers = [10, 20, 30, 40, 50]

# total = 0

# for num in numbers:
#     total += num

# average = total / len(numbers)

# print(average)

# numbers = [7, 2, 9, 4, 6]
# even = 0
# for num in numbers:
#     if num % 2 == 0:
#         even += 1
# print(even)

# lists = [7, 2, 9, 4, 6]
# odd = 0
# for i in lists:
#     if i % 2 != 0:
#         odd += 1
# print(odd)




# numbers = [12, 5, 18, 3, 20, 8]
# count = 0
# for num in numbers:
#     if num > 10:
#         count += 1
# print(count)

# numbers = [7, 2, 9, 1, 4, 8]
# count = 0
# for i in numbers:
#     if i < 5:
#         count += 1
# print(count)

# numbers = [3, 5, 6, 8, 9, 12]
# count = 0 
# for i in numbers:
#     if i % 3 == 0:
#         count += 1
# print(count)

# numbers = [7, 2, 9, 4, 6]
# found = False
# for i in numbers:
#     if i == 4:
#         found = True
# print(found)

# numbers = [7, 2, 9, 4, 6]
# find = False
# for i in numbers:
#     if i == 10:
#         find = True
# print(find)

# numbers = [5, 10, 15]
# numbers.append(20)
# print(numbers)

# fruits = ["apple", "banana"]
# fruits.append("orange")
# print(fruits)

# colors = ["red", "blue"]
# colors.append("yellow")
# colors.append("green")
# print(colors)

# names = []
# names.append("Rani")
# names.append("Aman")
# names.append("Priya")
# print(names)

# numbers = [10, 20, 30]
# numbers.insert(1, 15)
# print(numbers)

# fruits = ["banana", "orange"]
# fruits.insert(0, "apple")
# print(fruits)

# numbers = [1, 2, 3]

# numbers.insert(5, 10)

# print(numbers)

# languages = ["HTML", "JavaScript", "Python"]
# languages.insert(1, "CSS")
# print(languages)

# numbers = [10, 20, 30, 40]
# numbers.remove(20)
# print(numbers)

# numbers = [10, 20, 30, 40]
# print(numbers.pop())
# print(numbers)

# fruits = ["apple", "banana", "orange"]
# fruits.pop(0)
# print(fruits)

# numbers = [40, 10, 30, 20]
# numbers.sort()
# print(numbers)

# names = ["Rahul", "Aman", "Priya", "Rani"]
# names.sort()
# print(names)


# numbers = [5, 2, 5, 8, 5, 1]
# print(numbers.count(5))

# letters = ["A", "B", "A", "C", "A"]
# print(letters.count("A"))

# numbers = [10, 20, 30, 40]
# print(numbers.count(100))

# numbers = [10, 20, 30, 40]
# print(numbers.index(30))

# fruits = ["apple", "banana", "orange", "banana"]
# print(fruits.index("banana"))

# numbers = [10, 15, 20, 25, 30]
# if 25 in numbers:
#     print("Found")
# else:
#     print("Not Found")

# lists = list(map(int, input("enter : ").split()))
# lists = [1,5,3,26,7,8]
# num = max(lists)
# nums = min(lists)
# print()

# lists = [1,5,3,26,7,8]
# lists.sort()
# print()

# arr = [1, 8, 7, 2, 3, 11]
# num1 = 0
# num2 = 0
# for i in range(len(arr)):
#     if arr[i] > arr[i+1]:
#         num1 = i
#         print(num1)
#     elif arr[i] < arr[i+1]:
#         num2 = i 
#         print(num2)
#     else:
#         print("sorry please try again")

# n = 8
# num = 1
# count = 0
# if n < 0:
#     print("require positive number")

# while(n > count):
#     num = n * num
#     num - 1
#     count + 1
#     print(num)






























