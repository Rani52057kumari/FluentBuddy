arr = [1,2,1,3,4,2]
found = False
for i in range(len(arr)):
    for j in range(i+1, len(arr)):
        if arr[j] == arr[i]:
            print(arr[i])
            found = True
    if found == True:
        print(arr[i], "is duplicate")



















